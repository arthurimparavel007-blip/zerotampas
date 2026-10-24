// Zero Tampas · Publicador automático (API oficial do Instagram)
// Publica os posts da fila cuja hora já chegou. Pensado para correr a cada 30 min (GitHub Actions).
//
// Variáveis de ambiente:
//   IG_USER_ID       ID da conta profissional do Instagram (opcional: se faltar, o script descobre-o pelo token)
//   IG_ACCESS_TOKEN  token de longa duração (renovar a cada 60 dias: node renovar-token.js)
//   BASE_URL         endereço público onde estão as imagens, terminado em "/"
//                    ex.: https://raw.githubusercontent.com/SEU_USER/zerotampas/main/
//   GRAPH_HOST       graph.instagram.com (login Instagram, padrão) ou graph.facebook.com (login Facebook)
//   GRAPH_VERSION    versão da API (padrão v23.0; confirmar a atual na documentação da Meta)
//   MAX_POR_EXECUCAO quantos posts no máximo por execução (padrão 1)
//   DRY_RUN=1        só mostra o que faria, não publica
//   MAX_POR_DIA      teto de publicações (feed + stories) em 24 h (padrão 15; a API permite 100)
//   ATRASO_MAX_H     posts atrasados mais do que isto (horas) são marcados "expirado" em vez de sair em rajada (padrão 3)
//   FB_PAGE_ID       (opcional) ID da página do Facebook. Com FB_PAGE_TOKEN, cada Reel publicado no Instagram
//   FB_PAGE_TOKEN    sai também como Reel na página. Uma falha no Facebook nunca trava o Instagram.
//   SEM_STORY=1      não repete cada Reel nos stories (por defeito sai nos stories do Instagram e do Facebook)
//
// Estados de cada item em fila/fila.json → publicado: false (por publicar) | true | "falhou" | "expirado" | "cancelado" | "manual"
//   Para cancelar um post, troque false por "cancelado".
//
// Travões anti-bloqueio:
//   - Se existir o ficheiro PAUSA, não publica nada (apague-o para retomar).
//   - Se a Meta responder com erro de limite, spam ou bloqueio, o script cria PAUSA sozinho e pára.
//   - Antes de publicar, consulta a quota oficial (content_publishing_limit) e pára perto do limite.

const fs = require('fs');
const path = require('path');

const FILA = path.join(__dirname, 'fila', 'fila.json');
const PAUSA = path.join(__dirname, 'PAUSA');
const MAX_DIA = Number(process.env.MAX_POR_DIA || 15);
const ATRASO_MAX_H = Number(process.env.ATRASO_MAX_H ?? 3); // 0 = publica sempre, mesmo muito atrasado
// Códigos da Graph API que indicam limite, spam ou bloqueio temporário
const ERROS_BLOQUEIO = [4, 9, 17, 32, 368, 613, 2207042, 2207051];
const { IG_ACCESS_TOKEN, BASE_URL, DRY_RUN } = process.env;
let IG_USER_ID = process.env.IG_USER_ID; // opcional: se faltar, é descoberto pelo token (/me)
const HOST = process.env.GRAPH_HOST || 'graph.instagram.com';
const VER = process.env.GRAPH_VERSION || 'v23.0';
const MAX = Number(process.env.MAX_POR_EXECUCAO || 1);
const API = HOST.startsWith('http') ? `${HOST}/${VER}` : `https://${HOST}/${VER}`;

const espera = ms => new Promise(r => setTimeout(r, ms));

async function chamar(metodo, rota, params = {}) {
  const url = new URL(`${API}/${rota}`);
  const body = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
  const res = metodo === 'GET'
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method: 'POST', body });
  const json = await res.json();
  if (!res.ok || json.error) {
    const e = new Error(`${rota}: ${JSON.stringify(json.error || json)}`);
    const err = json.error || {};
    e.bloqueio = ERROS_BLOQUEIO.includes(err.code) || ERROS_BLOQUEIO.includes(err.error_subcode) || /spam|blocked|bloque|limit/i.test(err.message || '');
    throw e;
  }
  return json;
}

// Espera o contentor ficar pronto (a Meta pede no máximo 1 consulta por minuto, até 5 minutos)
// Vídeo (Reels) demora mais a processar: até ~8 min, a consultar de 30 em 30 s.
async function aguardarPronto(id, video = false) {
  const max = video ? 16 : 5;
  for (let i = 0; i < max; i++) {
    const r = await chamar('GET', id, { fields: video ? 'status_code,status' : 'status_code' });
    if (r.status_code === 'FINISHED') return;
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') throw new Error(`Contentor ${id}: ${r.status_code} ${r.status || ''}`);
    await espera(video ? (i === 0 ? 15000 : 30000) : (i === 0 ? 5000 : 60000));
  }
  throw new Error(`Contentor ${id} não ficou pronto a tempo`);
}

// Cria o contentor de um Reel (sem publicar). Usado também pelo modo de teste.
// Tenta primeiro o BASE_URL (raw do GitHub); se a Meta recusar o vídeo, tenta o VIDEO_BASE_URL_ALT
// (jsDelivr fixado no commit, que serve o ficheiro como video/mp4).
const caminhoUrl = p => p.split('/').map(encodeURIComponent).join('/');
// ---------- Crescimento ----------
// Reels de teste (Trial Reels): mostrados primeiro só a quem não segue. A Meta só os permite a partir de
// 1.000 seguidores, por isso ligam-se sozinhos quando a conta lá chegar. Horas em TRIAL_HORAS (Lisboa).
const TRIAL_MIN_SEGUIDORES = Number(process.env.TRIAL_MIN_SEGUIDORES || 1000);
const TRIAL_HORAS = (process.env.TRIAL_HORAS ?? '11:00,15:30').split(',').map(x => x.trim()).filter(Boolean);
let seguidores = null;
async function contaSeguidores() {
  if (seguidores !== null) return seguidores;
  try { seguidores = (await chamar('GET', IG_USER_ID, { fields: 'followers_count' })).followers_count ?? 0; } catch (_) { seguidores = 0; }
  return seguidores;
}
async function usarTrial(item) {
  if (process.env.TESTE_REEL || item.trial === false) return false;
  const hora = (item.quando_lisboa || '').slice(11, 16);
  if (!(item.trial === true || TRIAL_HORAS.includes(hora))) return false;
  if (/Comenta DEIXA e mando-te/.test(item.legenda || '')) return false; // vendas vão sempre para os seguidores
  return (await contaSeguidores()) >= TRIAL_MIN_SEGUIDORES;
}

// Primeiro comentário automático (pergunta que puxa respostas na 1.ª hora). Precisa da permissão
// instagram_business_manage_comments no token; sem ela, o publicador avisa e segue em frente.
const PERGUNTAS = {
  deixa: ['Usavas esta? Sim ou não 👇', 'Nota de 0 a 10 para esta deixa 👇', 'Onde é que a usavas? 👇'],
  dialogo: ['Nota de 0 a 10 para a lata dele 👇', 'Ela respondeu bem ou mal? 👇', 'O que dizias a seguir? 👇'],
  tweet: ['Concordas? 👇', 'Já te aconteceu? 👇', 'Verdade ou mentira? 👇'],
  marca: ['Marca já quem é 👇', 'Quem foi o primeiro nome que te veio à cabeça? 👇'],
  meme: ['Já te aconteceu? 😂', 'Sê sincero: és tu? 👇'],
  notas: ['O que falta nesta lista? 👇', 'Qual destas é a mais difícil? 👇'],
  chat: ['Tu mandavas qual: a de cima ou a de baixo? 👇', 'Já ficaste no visto assim? 👇'],
  lista: ['Qual vais testar primeiro? 👇', 'Guarda e diz-me qual é a tua preferida 👇'],
  vs: ['Já fizeste algum dos foleiros? Confessa 👇', 'Qual é o pior foleiro desta lista? 👇'],
  bloqueada: ['Comenta DEIXA e mando-te as outras duas 👇'],
};
let TEMPLATES = null;
function templateDe(id) {
  if (!TEMPLATES) {
    TEMPLATES = {};
    try {
      const dir = path.join(__dirname, 'conteudo');
      for (const f of fs.readdirSync(dir).filter(n => /^semana-\d+.*\.json$/.test(n)))
        for (const p of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).posts || []) TEMPLATES[p.id] = p.template;
    } catch (_) {}
  }
  return TEMPLATES[id];
}
let semPermComentario = false;
async function primeiroComentario(item) {
  if (!item.media_id || item.comentario || semPermComentario || process.env.SEM_COMENTARIO) return;
  const ops = PERGUNTAS[templateDe(item.id)] || PERGUNTAS.tweet;
  const msg = ops[[...item.id].reduce((a, c) => a + c.charCodeAt(0), 0) % ops.length];
  try {
    await espera(5000);
    await chamar('POST', `${item.media_id}/comments`, { message: msg });
    item.comentario = true;
    console.log(`  ✓ 1.º comentário: ${msg}`);
  } catch (e) {
    if (/permission|\(#10\)|\(#200\)|"code":(10|200|190)/i.test(e.message)) {
      semPermComentario = true; item.comentario = 'sem_permissao';
      console.log('  ⚠ 1.º comentário: o token não tem a permissão instagram_business_manage_comments (gerar token novo).');
    } else { item.comentario = 'falhou'; console.log('  ✗ 1.º comentário: ' + e.message.slice(0, 200)); }
  }
}

async function contentorReel(item, caminho) {
  const bases = [BASE_URL, process.env.VIDEO_BASE_URL_ALT].filter(Boolean);
  let ultimoErro;
  let trial = await usarTrial(item);
  for (const base of bases) {
    const url = base + caminhoUrl(caminho);
    const params = { media_type: 'REELS', video_url: url, caption: item.legenda, share_to_feed: 'true' };
    if (item.thumb_offset_ms) params.thumb_offset = String(item.thumb_offset_ms);
    if (trial) params.trial_params = JSON.stringify({ graduation_strategy: 'SS_PERFORMANCE' });
    try {
      const { id } = await chamar('POST', `${IG_USER_ID}/media`, params);
      await aguardarPronto(id, true);
      console.log(`  vídeo aceite: ${url}${trial ? ' (Reel de teste: primeiro só para quem não segue)' : ''}`);
      if (trial) item.trial = 'usado';
      return id;
    } catch (e) {
      if (e.bloqueio) throw e;
      if (trial && /trial/i.test(e.message)) {
        console.log('  Reel de teste recusado, sai como Reel normal'); trial = false; item.trial = false;
        try { const p2 = { ...params }; delete p2.trial_params; const { id } = await chamar('POST', `${IG_USER_ID}/media`, p2); await aguardarPronto(id, true); return id; } catch (e2) { if (e2.bloqueio) throw e2; ultimoErro = e2; continue; }
      }
      ultimoErro = e;
      console.log(`  vídeo recusado em ${url}: ${e.message.slice(0, 200)}`);
    }
  }
  throw ultimoErro;
}


// ---------- Story: o mesmo Reel também nos stories (Instagram e Facebook) ----------
// O vídeo já é 9:16, por isso vai tal e qual. SEM_STORY=1 desliga. Os stories não contam para o teto da fila.
async function storyDoReel(item) {
  if (item.tipo !== 'REELS' || item.story_id || item.story === 'falhou' || process.env.SEM_STORY) return;
  const bases = [BASE_URL, process.env.VIDEO_BASE_URL_ALT].filter(Boolean);
  let ultimo;
  for (const base of bases) {
    try {
      const { id } = await chamar('POST', `${IG_USER_ID}/media`, { media_type: 'STORIES', video_url: base + caminhoUrl(item.imagens[0]) });
      await aguardarPronto(id, true);
      for (let t = 1; ; t++) {
        await espera(t === 1 ? 5000 : 20000);
        try { item.story_id = (await chamar('POST', `${IG_USER_ID}/media_publish`, { creation_id: id })).id; break; }
        catch (e) { if (e.bloqueio || !/2207027|9007|not available|not ready/i.test(e.message) || t >= 4) throw e; }
      }
      item.story = true; delete item.story_erro;
      console.log(`  ✓ Story Instagram · media ${item.story_id}`);
      return;
    } catch (e) {
      if (e.bloqueio) throw e;
      ultimo = e;
    }
  }
  item.story_erro = String(ultimo?.message || ultimo).slice(0, 300);
  item.story_tentativas = (item.story_tentativas || 0) + 1;
  if (item.story_tentativas >= 2) item.story = 'falhou';
  console.log('  ✗ Story Instagram: ' + item.story_erro);
}

// ---------- Facebook: o mesmo Reel na página ----------
const { FB_PAGE_ID, FB_PAGE_TOKEN } = process.env;
const FB_API = (process.env.FB_GRAPH || 'https://graph.facebook.com') + '/' + VER;
let FB_TOKEN = null; // token da página (obtido a partir do token do usuário do sistema, se for o caso)
async function tokenDaPagina() {
  if (FB_TOKEN) return FB_TOKEN;
  try {
    const r = await fetch(`${FB_API}/${FB_PAGE_ID}?${new URLSearchParams({ fields: 'access_token', access_token: FB_PAGE_TOKEN })}`);
    const j = await r.json();
    FB_TOKEN = j.access_token || FB_PAGE_TOKEN;
  } catch (_) { FB_TOKEN = FB_PAGE_TOKEN; }
  return FB_TOKEN;
}
async function fb(metodo, url, params = {}, headers = {}) {
  const body = new URLSearchParams({ ...params, access_token: await tokenDaPagina() });
  const res = metodo === 'GET' ? await fetch(`${url}?${body}`) : await fetch(url, { method: 'POST', body, headers });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`FB ${url.split('/').slice(-2).join('/')}: ${JSON.stringify(j.error || j).slice(0, 300)}`);
  return j;
}
async function publicarFacebook(item) {
  const videoUrl = BASE_URL + caminhoUrl(item.imagens[0]);
  const { video_id, upload_url } = await fb('POST', `${FB_API}/${FB_PAGE_ID}/video_reels`, { upload_phase: 'start' });
  const up = await fetch(upload_url, { method: 'POST', headers: { Authorization: `OAuth ${await tokenDaPagina()}`, file_url: videoUrl } });
  const upj = await up.json().catch(() => ({}));
  if (!up.ok || upj.error || upj.success === false) throw new Error(`FB upload: ${JSON.stringify(upj).slice(0, 300)}`);
  await fb('POST', `${FB_API}/${FB_PAGE_ID}/video_reels`, { upload_phase: 'finish', video_id, video_state: 'PUBLISHED', description: item.legenda });
  // A página processa o vídeo depois do "finish"; confirmamos durante até ~4 min.
  for (let i = 0; i < 16; i++) {
    await espera(15000);
    const st = (await fb('GET', `${FB_API}/${video_id}`, { fields: 'status' })).status || {};
    if (st.video_status === 'error' || st.processing_phase?.status === 'error') throw new Error('FB processamento: ' + JSON.stringify(st).slice(0, 300));
    if (st.video_status === 'ready' || st.publishing_phase?.status === 'complete') return video_id;
  }
  return video_id; // ainda a processar, mas já está entregue; sai sozinho
}
async function tentarFacebook(item) {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN || item.tipo !== 'REELS' || item.fb === true) return;
  try {
    item.fb_video_id = await publicarFacebook(item);
    item.fb = true; delete item.fb_erro;
    console.log(`  ✓ Facebook · vídeo ${item.fb_video_id}`);
  } catch (e) {
    item.fb_erro = String(e.message).slice(0, 400);
    item.fb_tentativas = (item.fb_tentativas || 0) + 1;
    if (item.fb_tentativas >= 3) item.fb = 'falhou';
    console.error(`  ✗ Facebook: ${item.fb_erro}`);
  }
}

// Story na página do Facebook (video_stories). Uma falha aqui nunca trava o resto.
async function storyFacebook(item) {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN || item.tipo !== 'REELS' || item.fb_story === true || item.fb_story === 'falhou' || process.env.SEM_STORY) return;
  try {
    const videoUrl = BASE_URL + caminhoUrl(item.imagens[0]);
    const { video_id, upload_url } = await fb('POST', `${FB_API}/${FB_PAGE_ID}/video_stories`, { upload_phase: 'start' });
    const up = await fetch(upload_url, { method: 'POST', headers: { Authorization: `OAuth ${await tokenDaPagina()}`, file_url: videoUrl } });
    const upj = await up.json().catch(() => ({}));
    if (!up.ok || upj.error || upj.success === false) throw new Error(`FB story upload: ${JSON.stringify(upj).slice(0, 300)}`);
    const fim = await fb('POST', `${FB_API}/${FB_PAGE_ID}/video_stories`, { upload_phase: 'finish', video_id });
    item.fb_story = true; item.fb_story_id = fim.post_id || video_id; delete item.fb_story_erro;
    console.log(`  ✓ Story Facebook · ${item.fb_story_id}`);
  } catch (e) {
    item.fb_story_erro = String(e.message).slice(0, 300);
    item.fb_story_tentativas = (item.fb_story_tentativas || 0) + 1;
    if (item.fb_story_tentativas >= 2) item.fb_story = 'falhou';
    console.error(`  ✗ Story Facebook: ${item.fb_story_erro}`);
  }
}

async function publicar(item) {
  const urls = item.imagens.map(p => BASE_URL + p.split('/').map(encodeURIComponent).join('/'));
  let creationId;
  if (item.tipo === 'REELS') {
    creationId = await contentorReel(item, item.imagens[0]);
  } else if (item.tipo === 'STORY') {
    ({ id: creationId } = await chamar('POST', `${IG_USER_ID}/media`, { image_url: urls[0], media_type: 'STORIES' }));
  } else if (urls.length === 1) {
    ({ id: creationId } = await chamar('POST', `${IG_USER_ID}/media`, { image_url: urls[0], caption: item.legenda }));
  } else {
    if (urls.length > 10) throw new Error(`${item.id}: carrossel com mais de 10 imagens`);
    const filhos = [];
    for (const u of urls) {
      const { id } = await chamar('POST', `${IG_USER_ID}/media`, { image_url: u, is_carousel_item: 'true' });
      filhos.push(id);
    }
    for (const f of filhos) await aguardarPronto(f);
    ({ id: creationId } = await chamar('POST', `${IG_USER_ID}/media`, { media_type: 'CAROUSEL', children: filhos.join(','), caption: item.legenda }));
  }
  if (item.tipo !== 'REELS') await aguardarPronto(creationId);
  // A Meta às vezes diz FINISHED antes de o media estar mesmo disponível (erro 9007 / 2207027).
  // Espera um pouco e tenta de novo, até 5 vezes.
  for (let t = 1; ; t++) {
    await espera(t === 1 ? 8000 : 20000);
    try {
      const { id: mediaId } = await chamar('POST', `${IG_USER_ID}/media_publish`, { creation_id: creationId });
      return mediaId;
    } catch (e) {
      const ainda = /2207027|9007|not available|not ready/i.test(e.message);
      if (!ainda || t >= 5) throw e;
      console.log(`  media ainda não disponível, nova tentativa ${t + 1}/5…`);
    }
  }
}

(async () => {
  if (!DRY_RUN && (!IG_ACCESS_TOKEN || !BASE_URL)) {
    console.error('Faltam variáveis: IG_ACCESS_TOKEN e BASE_URL.'); process.exit(1);
  }
  if (process.env.TESTE_REEL) {
    // Modo de teste: cria o contentor do próximo Reel e espera o processamento, SEM publicar.
    const fila0 = JSON.parse(fs.readFileSync(FILA, 'utf8'));
    const it = fila0.find(f => !f.publicado && f.tipo === 'REELS');
    if (FB_PAGE_ID && FB_PAGE_TOKEN) {
      try {
        const t = await tokenDaPagina();
        const pg = await (await fetch(`${FB_API}/${FB_PAGE_ID}?${new URLSearchParams({ fields: 'name,id', access_token: t })}`)).json();
        if (pg.error) console.log(`[TESTE] ✗ Facebook: ${JSON.stringify(pg.error).slice(0, 300)}`);
        else console.log(`[TESTE] ✓ Facebook: acesso à página "${pg.name}" (${pg.id}) ${t === FB_PAGE_TOKEN ? 'com o token direto' : 'com token de página'}`);
      } catch (e) { console.log('[TESTE] ✗ Facebook: ' + e.message); }
    } else console.log('[TESTE] Facebook não configurado (faltam FB_PAGE_ID/FB_PAGE_TOKEN)');
    if (!it) { console.log('Não há Reels pendentes na fila.'); return; }
    if (!IG_USER_ID) { const me = await chamar('GET', 'me', { fields: 'user_id,username' }); IG_USER_ID = me.user_id || me.id; }
    console.log(`[TESTE] ${it.id} · ${it.imagens[0]}`);
    const id = await contentorReel(it, it.imagens[0]);
    console.log(`[TESTE] ✓ contentor ${id} processado (FINISHED). Nada foi publicado; o contentor expira sozinho em 24 h.`);
    return;
  }
  if (fs.existsSync(PAUSA)) { console.log('PAUSA ativa: ' + fs.readFileSync(PAUSA, 'utf8').trim() + '\nApague o ficheiro PAUSA para retomar.'); return; }
  const fila = JSON.parse(fs.readFileSync(FILA, 'utf8'));
  const agora = process.env.AGORA || new Date().toISOString(); // AGORA=2026-10-12T08:00:00Z para testar
  const ha24h = new Date(new Date(agora).getTime() - 864e5).toISOString();
  const feitos24h = fila.filter(f => f.publicado === true && (f.publicado_em || '') >= ha24h).length;
  if (feitos24h >= MAX_DIA) { console.log(`Teto diário atingido (${feitos24h}/${MAX_DIA} em 24 h). Fica para a próxima execução.`); return; }
  // Posts que perderam a hora há mais de ATRASO_MAX_H horas (conta parada, pausa, setup tardio) não saem em rajada:
  // ficam marcados "expirado" e o conteúdo continua no horário certo daqui para a frente.
  const limiteAtraso = new Date(new Date(agora).getTime() - ATRASO_MAX_H * 3600e3).toISOString();
  let expirados = 0;
  for (const f of fila) if (ATRASO_MAX_H > 0 && !f.publicado && f.quando_utc < limiteAtraso) { f.publicado = 'expirado'; expirados++; }
  if (expirados) { console.log(`${expirados} post(s) com mais de ${ATRASO_MAX_H} h de atraso marcados como "expirado".`); fs.writeFileSync(FILA, JSON.stringify(fila, null, 2)); }
  const devidos = fila.filter(f => !f.publicado && f.quando_utc <= agora).slice(0, Math.min(MAX, MAX_DIA - feitos24h));
  // Reels já no Instagram que ainda não foram para a página do Facebook (ex.: token adicionado depois)
  if (!DRY_RUN && FB_PAGE_ID && FB_PAGE_TOKEN) {
    const pend = fila.filter(f => f.publicado === true && f.tipo === 'REELS' && !f.fb && (f.publicado_em || '') >= limiteAtraso).slice(0, 1);
    for (const f of pend) { console.log(`→ ${f.id} só no Facebook (já está no Instagram)`); await tentarFacebook(f); fs.writeFileSync(FILA, JSON.stringify(fila, null, 2)); }
  }
  // Reels recentes que ainda não saíram nos stories (ex.: função ligada depois)
  if (!DRY_RUN && !process.env.SEM_STORY) {
    const semStory = fila.filter(f => f.publicado === true && f.tipo === 'REELS' && (f.publicado_em || '') >= limiteAtraso && ((!f.story_id && f.story !== 'falhou') || (FB_PAGE_ID && FB_PAGE_TOKEN && f.fb_story !== true && f.fb_story !== 'falhou'))).slice(0, 1);
    for (const f of semStory) {
      console.log(`→ ${f.id} só nos stories (o Reel já está publicado)`);
      try {
        if (!IG_USER_ID) { const me = await chamar('GET', 'me', { fields: 'user_id,username' }); IG_USER_ID = me.user_id || me.id; }
        await storyDoReel(f);
      } catch (e) { if (e.bloqueio) { fs.writeFileSync(PAUSA, `${new Date().toISOString()} · bloqueio ao publicar story de ${f.id}: ${e.message}`); fs.writeFileSync(FILA, JSON.stringify(fila, null, 2)); return; } }
      await storyFacebook(f); fs.writeFileSync(FILA, JSON.stringify(fila, null, 2));
    }
  }
  if (!devidos.length) { console.log(`Nada para publicar (${agora}).`); return; }

  if (!DRY_RUN && !IG_USER_ID) {
    const me = await chamar('GET', 'me', { fields: 'user_id,username' });
    IG_USER_ID = me.user_id || me.id;
    console.log(`Conta: @${me.username} (${IG_USER_ID})`);
  }
  if (!DRY_RUN) {
    try {
      const q = await chamar('GET', `${IG_USER_ID}/content_publishing_limit`, { fields: 'quota_usage,config' });
      const uso = q.data?.[0]?.quota_usage ?? 0, total = q.data?.[0]?.config?.quota_total ?? 100;
      console.log(`Quota oficial: ${uso}/${total} em 24 h`);
      if (uso >= total - 5) { console.log('Perto do limite oficial da API. Fica para a próxima execução.'); return; }
    } catch (e) { console.log('Aviso: não consegui ler a quota (' + e.message.slice(0, 120) + ')'); }
  }

  for (const item of devidos) {
    console.log(`→ ${item.id} (${item.quando_lisboa} Lisboa) · ${item.tipo} · ${item.imagens.length} imagem(ns)`);
    if (DRY_RUN) { console.log('  [DRY_RUN] não publicado'); continue; }
    try {
      item.media_id = await publicar(item);
      item.publicado = true;
      item.publicado_em = new Date().toISOString();
      console.log(`  ✓ publicado · media ${item.media_id}`);
      fs.writeFileSync(FILA, JSON.stringify(fila, null, 2));
      if (item.tipo === 'REELS') await primeiroComentario(item);
      await tentarFacebook(item);
      if (item.tipo === 'REELS') {
        await storyDoReel(item); fs.writeFileSync(FILA, JSON.stringify(fila, null, 2));
        await storyFacebook(item); fs.writeFileSync(FILA, JSON.stringify(fila, null, 2));
      }
    } catch (e) {
      item.erro = String(e.message).slice(0, 500);
      item.tentativas = (item.tentativas || 0) + 1;
      console.error(`  ✗ ${item.erro}`);
      if (e.bloqueio) {
        fs.writeFileSync(PAUSA, `${new Date().toISOString()} · a Meta devolveu erro de limite/bloqueio ao publicar ${item.id}: ${item.erro}`);
        fs.writeFileSync(FILA, JSON.stringify(fila, null, 2));
        console.error('  ⛔ Sinal de bloqueio: publicação em PAUSA. Espere 24–48 h, reduza MAX_POR_DIA e apague o ficheiro PAUSA.');
        return;
      }
      if (item.tentativas >= 3) { item.publicado = 'falhou'; console.error('  3 tentativas falhadas: marcado como "falhou"'); }
    }
    fs.writeFileSync(FILA, JSON.stringify(fila, null, 2));
  }
})();
