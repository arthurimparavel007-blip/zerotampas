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
async function aguardarPronto(id) {
  for (let i = 0; i < 5; i++) {
    const { status_code } = await chamar('GET', id, { fields: 'status_code' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Contentor ${id}: ${status_code}`);
    await espera(i === 0 ? 5000 : 60000);
  }
  throw new Error(`Contentor ${id} não ficou pronto em 5 minutos`);
}

async function publicar(item) {
  const urls = item.imagens.map(p => BASE_URL + p.split('/').map(encodeURIComponent).join('/'));
  let creationId;
  if (item.tipo === 'STORY') {
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
  await aguardarPronto(creationId);
  const { id: mediaId } = await chamar('POST', `${IG_USER_ID}/media_publish`, { creation_id: creationId });
  return mediaId;
}

(async () => {
  if (!DRY_RUN && (!IG_ACCESS_TOKEN || !BASE_URL)) {
    console.error('Faltam variáveis: IG_ACCESS_TOKEN e BASE_URL.'); process.exit(1);
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
