// Zero Tampas · Imitação local da Graph API do Instagram, para testar sem token e sem publicar nada.
// Uso:  node ferramentas/mock-graph.js &        (porta 8799; BLOQ=3 simula bloqueio à 4.ª publicação)
//       GRAPH_HOST=http://localhost:8799 IG_USER_ID=1 IG_ACCESS_TOKEN=x BASE_URL=http://x/ node publicar.js
//       GRAPH_HOST=http://localhost:8799 IG_USER_ID=1 IG_ACCESS_TOKEN=x node insights.js
const http = require('http');
const PORT = Number(process.env.MOCK_PORT || 8799);
const BLOQ = process.env.BLOQ === undefined ? Infinity : Number(process.env.BLOQ);
let n = 0, pubs = 0;
const publicados = []; // ids devolvidos por media_publish
const rnd = (seed, max) => Math.floor((Math.abs(Math.sin(seed * 9301 + 49297)) * 233280) % max);

http.createServer((req, res) => {
  let b = '';
  req.on('data', d => (b += d));
  req.on('end', () => {
    const u = new URL(req.url, 'http://x');
    const p = new URLSearchParams(b || u.search);
    let out, st = 200;
    const rota = u.pathname.split('/').filter(Boolean).slice(1); // sem a versão
    if (rota[1] === 'content_publishing_limit') out = { data: [{ quota_usage: pubs, config: { quota_total: 100, quota_duration: 86400 } }] };
    else if (req.method === 'POST' && rota[1] === 'media') { n++; out = { id: 'c' + n }; console.log('[mock] media', p.get('media_type') || 'IMAGE', (p.get('image_url') || '').split('/').pop()); }
    else if (req.method === 'POST' && rota[1] === 'media_publish') {
      if (pubs >= BLOQ) { st = 400; out = { error: { message: 'Application request limit reached', code: 4 } }; }
      else { pubs++; const id = '1790000000' + pubs; publicados.push(id); out = { id }; }
      console.log('[mock] publish', st);
    }
    else if (rota[1] === 'media' && req.method === 'GET') {
      const ids = publicados.length ? publicados : ['17900000001', '17900000002', '17900000003'];
      out = { data: ids.slice().reverse().map((id, i) => ({ id, media_type: 'IMAGE', caption: 'teste', timestamp: new Date(Date.now() - i * 3600e3).toISOString(), permalink: 'https://www.instagram.com/p/' + id, like_count: 10 + i, comments_count: i })) };
    }
    else if (rota[1] === 'insights') {
      const s = Number(String(rota[0]).slice(-3)) || 1;
      const reach = 300 + rnd(s, 4000);
      const v = { reach, views: reach * 2, likes: rnd(s + 1, 300), comments: rnd(s + 2, 40), saved: rnd(s + 3, 120), shares: rnd(s + 4, 200), total_interactions: 0 };
      out = { data: (p.get('metric') || '').split(',').map(name => ({ name, period: 'lifetime', values: [{ value: v[name] ?? 0 }] })) };
    }
    else if (rota.length === 1 && req.method === 'GET' && p.get('fields')) {
      if ((p.get('fields') || '').includes('status_code')) out = { status_code: 'FINISHED' };
      else out = { id: rota[0] === 'me' ? '1' : rota[0], user_id: '1', username: 'zerotampas', followers_count: 1234, media_count: publicados.length || 3 };
    }
    else out = { status_code: 'FINISHED' };
    res.statusCode = st;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(out));
  });
}).listen(PORT, () => console.log(`[mock] Graph API falsa em http://localhost:${PORT}`));
