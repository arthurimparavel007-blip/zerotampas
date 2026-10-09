// Zero Tampas · Métricas da página (API oficial do Instagram)
// Lê seguidores + métricas de cada post publicado e escreve:
//   dados/insights.json   dados brutos por post (para o Claude analisar)
//   dados/seguidores.csv  1 linha por dia (crescimento)
//   dados/ranking.md      o que está a funcionar: top/flop, médias por template, hora e cor
//
// Variáveis: IG_USER_ID, IG_ACCESS_TOKEN, GRAPH_HOST (padrão graph.instagram.com), GRAPH_VERSION, DIAS (padrão 21)
// Uso: node insights.js            (precisa de token)
//      node insights.js --offline  (só refaz o ranking a partir de dados/insights.json)

const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const DADOS = path.join(ROOT, 'dados');
const { IG_ACCESS_TOKEN } = process.env;
let IG_USER_ID = process.env.IG_USER_ID; // opcional: descoberto pelo token se faltar
const HOST = process.env.GRAPH_HOST || 'graph.instagram.com';
const VER = process.env.GRAPH_VERSION || 'v23.0';
const API = HOST.startsWith('http') ? `${HOST}/${VER}` : `https://${HOST}/${VER}`;
const DIAS = Number(process.env.DIAS || 21);
const METRICAS = ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions'];

async function get(rota, params = {}) {
  const url = rota.startsWith('http') ? rota : `${API}/${rota}?${new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN })}`;
  const res = await fetch(url);
  const j = await res.json();
  if (!res.ok || j.error) throw new Error(`${rota}: ${JSON.stringify(j.error || j).slice(0, 300)}`);
  return j;
}

// Algumas métricas não existem para todos os tipos; tenta o conjunto todo e depois uma a uma
async function metricas(mediaId) {
  const out = {};
  try {
    const j = await get(`${mediaId}/insights`, { metric: METRICAS.join(',') });
    for (const m of j.data || []) out[m.name] = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
    return out;
  } catch (_) { /* cai para uma a uma */ }
  for (const m of METRICAS) {
    try {
      const j = await get(`${mediaId}/insights`, { metric: m });
      out[m] = j.data?.[0]?.values?.[0]?.value ?? j.data?.[0]?.total_value?.value ?? 0;
    } catch (_) { /* métrica indisponível */ }
  }
  return out;
}

function mapaPosts() {
  // media_id → item da fila → post original (template, cor, hora)
  const fila = JSON.parse(fs.readFileSync(path.join(ROOT, 'fila', 'fila.json'), 'utf8'));
  const posts = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'conteudo')).filter(n => /^semana-\d+.*\.json$/.test(n))) {
    for (const p of JSON.parse(fs.readFileSync(path.join(ROOT, 'conteudo', f), 'utf8')).posts || []) posts[p.id] = p;
  }
  const porMedia = {};
  for (const it of fila) if (it.media_id) porMedia[it.media_id] = { item: it, post: posts[it.id] };
  return porMedia;
}

const faixa = h => !h ? '?' : h < '10:00' ? 'manhã cedo (até 10h)' : h < '14:00' ? 'almoço (10–14h)' : h < '18:00' ? 'tarde (14–18h)' : h < '21:00' ? 'fim de tarde (18–21h)' : 'noite (21h+)';
const r1 = x => Math.round(x * 10) / 10;

function ranking(dados) {
  const ps = dados.posts.filter(p => p.reach > 0);
  const L = [];
  L.push(`# Zero Tampas · ranking de conteúdo`, ``, `Atualizado: ${dados.atualizado} · @${dados.conta.username || 'zerotampas'} · **${dados.conta.followers_count ?? '?'} seguidores** · ${dados.conta.media_count ?? '?'} posts`, ``);
  const seg = fs.existsSync(path.join(DADOS, 'seguidores.csv')) ? fs.readFileSync(path.join(DADOS, 'seguidores.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(',')) : [];
  if (seg.length > 1) {
    const ult = seg.slice(-8);
    L.push(`## Seguidores (últimos dias)`, ``, `| Dia | Seguidores | Δ |`, `| --- | --- | --- |`);
    ult.forEach((s, i) => L.push(`| ${s[0]} | ${s[1]} | ${i ? (s[1] - ult[i - 1][1] >= 0 ? '+' : '') + (s[1] - ult[i - 1][1]) : ''} |`));
    L.push('');
  }
  if (!ps.length) { L.push('_Ainda sem posts com alcance medido._'); return L.join('\n'); }
  const med = k => r1(ps.reduce((a, p) => a + (p[k] || 0), 0) / ps.length);
  L.push(`## Médias (${ps.length} posts com alcance)`, ``,
    `Alcance ${med('reach')} · partilhas ${med('shares')} · guardados ${med('saved')} · comentários ${med('comments')} · gostos ${med('likes')}`, ``,
    `**Nota** = (partilhas×3 + guardados×2 + comentários) por 1000 de alcance. Partilhas por mensagem são o sinal que mais pesa no alcance para não-seguidores.`, ``);
  const linha = p => `| ${p.id || p.media_id} | ${p.template || '?'} | ${p.cor || ''} | ${p.hora || ''} | ${p.reach} | ${p.shares || 0} | ${p.saved || 0} | ${p.comments || 0} | **${p.nota}** | ${(p.resumo || '').slice(0, 60)} |`;
  const cab = [`| Post | Template | Cor | Hora | Alcance | Partilhas | Guardados | Coment. | Nota | Texto |`, `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`];
  const ord = [...ps].sort((a, b) => b.nota - a.nota);
  L.push(`## Top 10 (repetir o formato, variar o texto)`, ``, ...cab, ...ord.slice(0, 10).map(linha), ``);
  if (ord.length >= 15) L.push(`## Piores 5 (evitar ou mudar o ângulo)`, ``, ...cab, ...ord.slice(-5).reverse().map(linha), ``);
  for (const [titulo, chave] of [['Por template', 'template'], ['Por faixa horária', 'faixa'], ['Por cor', 'cor'], ['Por dia da semana', 'dia_semana']]) {
    const g = {};
    for (const p of ps) (g[p[chave] || '?'] ||= []).push(p);
    L.push(`## ${titulo}`, ``, `| ${chave} | Posts | Nota média | Alcance médio | Partilhas médias |`, `| --- | --- | --- | --- | --- |`);
    Object.entries(g).map(([k, v]) => [k, v.length, r1(v.reduce((a, p) => a + p.nota, 0) / v.length), r1(v.reduce((a, p) => a + p.reach, 0) / v.length), r1(v.reduce((a, p) => a + (p.shares || 0), 0) / v.length)])
      .sort((a, b) => b[2] - a[2]).forEach(r => L.push(`| ${r.join(' | ')} |`));
    L.push('');
  }
  return L.join('\n');
}

(async () => {
  fs.mkdirSync(DADOS, { recursive: true });
  const jsonPath = path.join(DADOS, 'insights.json');
  if (process.argv.includes('--offline')) {
    const d = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    fs.writeFileSync(path.join(DADOS, 'ranking.md'), ranking(d));
    return console.log('✓ dados/ranking.md refeito a partir de dados/insights.json');
  }
  if (!IG_ACCESS_TOKEN) { console.error('Falta IG_ACCESS_TOKEN (ou use --offline).'); process.exit(1); }
  if (!IG_USER_ID) { const me = await get('me', { fields: 'user_id,username' }); IG_USER_ID = me.user_id || me.id; }

  const conta = await get(IG_USER_ID, { fields: 'username,followers_count,media_count' });
  const desde = new Date(Date.now() - DIAS * 864e5).toISOString();
  let media = [], pag = await get(`${IG_USER_ID}/media`, { fields: 'id,caption,media_type,timestamp,permalink,like_count,comments_count', limit: 50 });
  for (let i = 0; i < 6; i++) {
    media.push(...(pag.data || []));
    const ultimo = pag.data?.at(-1)?.timestamp;
    if (!pag.paging?.next || (ultimo && new Date(ultimo).toISOString() < desde)) break;
    pag = await get(pag.paging.next);
  }
  media = media.filter(m => new Date(m.timestamp).toISOString() >= desde);

  const mapa = mapaPosts();
  const posts = [];
  for (const m of media) {
    const met = await metricas(m.id);
    const { item, post } = mapa[m.id] || {};
    if (item?.tipo === 'STORY' || m.media_type === 'STORY') continue; // stories medem-se à parte (expiram em 24 h)
    const reach = met.reach || 0;
    const nota = reach ? r1(((met.shares || 0) * 3 + (met.saved || 0) * 2 + (met.comments ?? m.comments_count ?? 0)) / reach * 1000) : 0;
    const hora = post?.hora || new Date(m.timestamp).toLocaleTimeString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' });
    posts.push({
      media_id: m.id, id: item?.id || null, template: post?.template || null, cor: post?.cor || null, hora,
      faixa: faixa(hora), dia_semana: new Date(m.timestamp).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long' }),
      timestamp: m.timestamp, permalink: m.permalink, media_type: m.media_type,
      resumo: (post?.frase || post?.texto || post?.punch || post?.capa?.titulo || post?.falas?.[0]?.txt || m.caption || '').replace(/\s+/g, ' ').slice(0, 90),
      reach, views: met.views || 0, likes: met.likes ?? m.like_count ?? 0, comments: met.comments ?? m.comments_count ?? 0,
      saved: met.saved || 0, shares: met.shares || 0, total_interactions: met.total_interactions || 0, nota,
    });
  }
  const dados = { atualizado: new Date().toISOString(), janela_dias: DIAS, conta, posts };
  fs.writeFileSync(jsonPath, JSON.stringify(dados, null, 2));

  const csvPath = path.join(DADOS, 'seguidores.csv');
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  const linhas = fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf8').trim().split('\n') : ['dia,seguidores,posts'];
  const sem = linhas.filter(l => !l.startsWith(hoje));
  sem.push(`${hoje},${conta.followers_count ?? ''},${conta.media_count ?? ''}`);
  fs.writeFileSync(csvPath, sem.join('\n') + '\n');

  fs.writeFileSync(path.join(DADOS, 'ranking.md'), ranking(dados));
  console.log(`✓ ${posts.length} posts medidos · ${conta.followers_count} seguidores · dados/ranking.md atualizado`);
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
