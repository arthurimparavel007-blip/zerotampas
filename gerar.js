// Zero Tampas · Gerador de posts
// Lê conteudo/semana-XX.json, gera as imagens JPEG 1080x1350 em saida/semana-XX/
// e acrescenta os posts à fila de publicação (fila/fila.json + fila/fila.csv).
//
// Uso:  node gerar.js conteudo/semana-01.json

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const FONTS = path.join(ROOT, 'node_modules', '@fontsource');
const W = 1080, H = 1350;

const CAP = `<svg viewBox="0 0 100 100"><polygon points="50.0,2.0 56.3,8.0 64.1,4.1 68.4,11.7 77.0,10.3 78.9,18.8 87.5,20.1 86.8,28.8 94.7,32.5 91.4,40.5 97.9,46.4 92.4,53.2 96.8,60.7 89.6,65.5 91.6,74.0 83.2,76.5 82.6,85.2 73.9,85.1 70.8,93.2 62.5,90.6 57.2,97.5 50.0,92.5 42.8,97.5 37.5,90.6 29.2,93.2 26.1,85.1 17.4,85.2 16.8,76.5 8.4,74.0 10.4,65.5 3.2,60.7 7.6,53.2 2.1,46.4 8.6,40.5 5.3,32.5 13.2,28.8 12.5,20.1 21.1,18.8 23.0,10.3 31.6,11.7 35.9,4.1 43.7,8.0" fill="#FFD84A" stroke="#2A0B2D" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="50" r="30" fill="#FF7A2F" stroke="#2A0B2D" stroke-width="4"/><line x1="16" y1="84" x2="84" y2="16" stroke="#FF2D87" stroke-width="11" stroke-linecap="round"/></svg>`;

// Paleta da marca. "t" = cor do texto sobre o fundo.
const CORES = {
  mag:  { bg: '#FF2D87', t: '#FFFFFF', acc: '#FFD84A' },
  tan:  { bg: '#FF7A2F', t: '#FFFFFF', acc: '#2A0B2D' },
  sol:  { bg: '#FFD84A', t: '#2A0B2D', acc: '#FF2D87' },
  plum: { bg: '#3E0F45', t: '#FFFFFF', acc: '#FFD84A' },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/([^\s<>]+-[^\s<>]+)/g, '<span style="white-space:nowrap">$1</span>'); // não partir palavras com hífen (rir-me, dá-me)
// Tamanho de letra conforme o comprimento do texto
const fit = (s, sizes = [[40, 104], [65, 90], [90, 78], [120, 68], [160, 60], [9999, 52]]) => {
  const n = String(s).length; for (const [max, px] of sizes) if (n <= max) return px; return 52;
};

const BASE = `
@font-face{font-family:B;src:url(file://${FONTS}/bricolage-grotesque/files/bricolage-grotesque-latin-400-normal.woff2);font-weight:400}
@font-face{font-family:B;src:url(file://${FONTS}/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2);font-weight:700}
@font-face{font-family:B;src:url(file://${FONTS}/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2);font-weight:800}
@font-face{font-family:H;src:url(file://${FONTS}/caveat/files/caveat-latin-700-normal.woff2);font-weight:700}
:root{--ink:#2A0B2D;--blush:#FFEAF2;--mag:#FF2D87;--tan:#FF7A2F;--sol:#FFD84A;--plum:#3E0F45}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:B,'Noto Color Emoji',sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.ad{width:${W}px;height:${H}px;position:relative;overflow:hidden;display:flex;flex-direction:column}
h1,h2{font-weight:800;letter-spacing:-.03em;line-height:.98;text-wrap:balance}
.hand{font-family:H;font-weight:700}
.top{display:flex;align-items:center;justify-content:space-between;padding:56px 64px 0}
.brand{display:flex;align-items:center;gap:14px;font-weight:800;font-size:34px;letter-spacing:-.02em}
.brand svg{width:56px;height:56px}
.pill{display:inline-block;border:4px solid var(--ink);border-radius:999px;font-weight:800;font-size:28px;padding:8px 22px;background:#fff;color:var(--ink)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:20px;background:var(--ink);color:#fff;padding:30px 64px;font-size:30px;font-weight:700}
.foot b{color:var(--sol)}
.foot .handle{opacity:.75;font-size:26px}
.card{background:#fff;color:var(--ink);border:5px solid var(--ink);border-radius:40px;box-shadow:14px 14px 0 var(--ink)}
.pager{position:absolute;right:64px;top:64px;font-weight:800;font-size:26px;padding:6px 18px;border-radius:999px;background:var(--ink);color:#fff}
`;

const foot = (txt = 'Comenta <b>DEIXA</b> e recebe mais por mensagem') =>
  `<div class="foot"><span>${txt}</span><span class="handle">@zerotampas</span></div>`;
const top = (c, right = '') =>
  `<div class="top"><div class="brand" style="color:${c.t}">${CAP}<span>Zero Tampas</span></div>${right}</div>`;

// ---------- TEMPLATES ----------
const T = {};

T.deixa = p => {
  const c = CORES[p.cor || 'mag'];
  return [`<div class="ad" style="background:${c.bg};color:${c.t}">
    ${top(c, `<span class="pill">${p.numero ? `Deixa do dia #${p.numero}` : "Fixado 📌"}</span>`)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px 40px">
      <div class="hand" style="font-size:76px;color:${c.acc};transform:rotate(-3deg);margin-bottom:84px">${esc(p.local)}</div>
      <div class="card" style="padding:64px 60px 70px;position:relative">
        <div style="position:absolute;top:-58px;left:40px;font-size:190px;font-weight:800;line-height:1;color:${c.acc};-webkit-text-stroke:5px var(--ink)">“</div>
        <h1 style="font-size:${fit(p.frase)}px;line-height:1.06">${esc(p.frase)}</h1>
      </div>
    </div>
    ${foot(p.rodape || 'Comenta <b>DEIXA</b> e recebe mais 100')}
  </div>`];
};

const capaSlide = (p, c, total) => `<div class="ad" style="background:${c.bg};color:${c.t}">
    ${top(c)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px">
      <span class="pill" style="align-self:flex-start;margin-bottom:40px;transform:rotate(-2deg)">${esc(p.capa.eyebrow)}</span>
      <h1 style="font-size:${fit(p.capa.titulo, [[30, 140], [45, 124], [60, 110], [9999, 96]])}px">${esc(p.capa.titulo)}</h1>
    </div>
    <div class="hand" style="font-size:64px;color:${c.acc};text-align:right;padding:0 64px 60px">arrasta para o lado →</div>
  </div>`;

const ctaSeguir = (c) => `<div class="ad" style="background:var(--ink);color:#fff">
    ${top({ t: '#fff' })}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px;gap:46px">
      <h1 style="font-size:112px">Gostaste? <span style="color:var(--sol)">🔁</span></h1>
      <div style="font-size:54px;font-weight:700;line-height:1.3">Envia a quem precisa de ler isto<br><span style="color:var(--sol)">e segue @zerotampas</span><br><span style="opacity:.8;font-size:42px">uma deixa nova todos os dias.</span></div>
    </div>
    ${foot('Comenta <b>DEIXA</b> e mando-te mais, de borla')}
  </div>`;

const ctaSlide = (c) => `<div class="ad" style="background:var(--ink);color:#fff">
    ${top({ t: '#fff' })}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px;gap:40px">
      <h1 style="font-size:104px">Queres as <span style="color:var(--sol)">101</span>?</h1>
      <div style="display:flex;gap:44px;align-items:center">
        <div style="width:330px;height:420px;flex:none;background:var(--mag);border:6px solid #fff;border-radius:12px 26px 26px 12px;box-shadow:16px 16px 0 var(--sol);transform:rotate(-4deg);padding:30px;display:flex;flex-direction:column;justify-content:flex-end;position:relative">
          <div style="position:absolute;top:-40px;right:-40px;width:130px;height:130px">${CAP}</div>
          <div style="font-weight:800;font-size:66px;line-height:.88;letter-spacing:-.03em">ZERO<br>TAMPAS</div>
          <div style="font-size:24px;font-weight:700;margin-top:12px">101 deixas que não são foleiras</div>
        </div>
        <div style="font-size:40px;font-weight:700;line-height:1.3">
          <div>Comenta <span style="background:var(--sol);color:var(--ink);padding:0 12px;border-radius:10px">DEIXA</span></div>
          <div style="opacity:.8;font-size:32px;margin-top:14px">e recebes por mensagem.</div>
          <div style="margin-top:34px;font-size:32px">Guia completo:<br><b style="color:var(--sol);font-size:52px">12,90 €</b></div>
        </div>
      </div>
    </div>
    ${foot('Link na bio · MB WAY · Multibanco')}
  </div>`;

T.lista = p => {
  const c = CORES[p.cor || 'sol'];
  const n = p.itens.length + (p.dica ? 1 : 0) + 2;
  const slides = [capaSlide(p, c, n)];
  p.itens.forEach((it, i) => slides.push(`<div class="ad" style="background:var(--blush)">
    ${top({ t: 'var(--ink)' })}
    <div class="pager">${i + 2}/${n}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px;gap:34px">
      <div style="font-size:230px;font-weight:800;line-height:.8;color:${c.bg === '#FFD84A' ? 'var(--mag)' : c.bg};letter-spacing:-.05em">${i + 1}</div>
      <div class="card" style="padding:50px 54px"><h2 style="font-size:${fit(it.titulo, [[30, 96], [60, 80], [90, 70], [9999, 60]])}px;line-height:1.06">${esc(it.titulo)}</h2></div>
      ${it.nota ? `<div style="font-size:40px;font-weight:600;line-height:1.3;color:#5a3a5e;max-width:900px">${esc(it.nota)}</div>` : ''}
    </div>
    ${foot()}
  </div>`));
  if (p.dica) slides.push(`<div class="ad" style="background:${c.bg};color:${c.t}">
    ${top(c)}<div class="pager">${n - 1}/${n}</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px;gap:36px">
      <span class="pill" style="align-self:flex-start">${esc(p.dica.titulo)}</span>
      <h1 style="font-size:${fit(p.dica.texto, [[60, 100], [100, 84], [9999, 72]])}px;line-height:1.05">${esc(p.dica.texto)}</h1>
    </div>${foot()}
  </div>`);
  slides.push(p.cta === 'seguir' ? ctaSeguir(c) : ctaSlide(c));
  return slides;
};

T.vs = p => {
  const c = CORES[p.cor || 'plum'];
  const n = p.pares.length + 2;
  const slides = [capaSlide(p, c, n)];
  p.pares.forEach((pr, i) => slides.push(`<div class="ad" style="background:var(--blush)">
    ${top({ t: 'var(--ink)' })}<div class="pager">${i + 2}/${n}</div>
    <div style="flex:1;display:grid;gap:44px;padding:40px 64px;align-content:center">
      <div style="background:#fff;border:5px solid var(--ink);border-radius:40px;padding:40px 46px">
        <div style="display:inline-block;background:var(--mag);color:#fff;font-weight:800;font-size:30px;border-radius:999px;padding:6px 22px;margin-bottom:22px">❌ FOLEIRO</div>
        <p style="font-size:${fit(pr.foleiro, [[30, 66], [70, 56], [9999, 48]])}px;font-weight:700;line-height:1.15;text-decoration:line-through;text-decoration-color:var(--mag);text-decoration-thickness:7px">${esc(pr.foleiro)}</p>
      </div>
      <div style="background:var(--sol);border:5px solid var(--ink);border-radius:40px;padding:40px 46px;box-shadow:14px 14px 0 var(--ink)">
        <div style="display:inline-block;background:var(--ink);color:var(--sol);font-weight:800;font-size:30px;border-radius:999px;padding:6px 22px;margin-bottom:22px">✅ FIXE</div>
        <p style="font-size:${fit(pr.fixe, [[40, 66], [80, 56], [9999, 48]])}px;font-weight:700;line-height:1.15">${esc(pr.fixe)}</p>
      </div>
    </div>
    ${foot()}
  </div>`));
  slides.push(p.cta === 'seguir' ? ctaSeguir(c) : ctaSlide(c));
  return slides;
};

const bolha = (m, accent) => m.de === 'eu'
  ? `<div style="align-self:flex-end;max-width:88%;background:${accent ? 'var(--mag)' : '#E9E3EC'};color:${accent ? '#fff' : 'var(--ink)'};border-radius:30px 30px 8px 30px;padding:20px 24px;font-size:31px;font-weight:600;line-height:1.22">${esc(m.txt)}</div>`
  : `<div style="align-self:flex-start;max-width:88%;background:#E9E3EC;border-radius:30px 30px 30px 8px;padding:20px 24px;font-size:31px;font-weight:600;line-height:1.22">${esc(m.txt)}</div>`;

T.chat = p => [`<div class="ad" style="background:var(--plum);color:#fff">
    ${top({ t: '#fff' })}
    <div style="padding:36px 64px 0"><h1 style="font-size:${fit(p.titulo, [[34, 92], [9999, 78]])}px">${esc(p.titulo)}</h1></div>
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:44px 64px 18px;align-items:start">
      <div style="background:#fff;color:var(--ink);border-radius:40px;padding:34px 28px 40px;display:flex;flex-direction:column;gap:16px;opacity:.94">
        <div style="font-weight:800;font-size:30px;color:var(--mag);margin-bottom:6px">❌ Antes</div>
        ${p.antes.map(m => bolha(m, false)).join('')}
        <div style="align-self:flex-end;font-size:24px;color:#8a7a8d">${esc(p.antes_rodape || '')}</div>
      </div>
      <div style="background:#fff;color:var(--ink);border-radius:40px;padding:34px 28px 40px;display:flex;flex-direction:column;gap:16px;border:5px solid var(--sol);box-shadow:12px 12px 0 var(--sol)">
        <div style="font-weight:800;font-size:30px;color:#1a8a4a;margin-bottom:6px">✅ Depois</div>
        ${p.depois.map(m => bolha(m, true)).join('')}
      </div>
    </div>
    <div style="text-align:center;font-size:22px;opacity:.6;padding-bottom:18px">Exemplo ilustrativo</div>
    ${foot()}
  </div>`];

T.notas = p => [`<div class="ad" style="background:var(--sol)">
    ${top({ t: 'var(--ink)' })}
    <div style="margin:40px 64px 0;flex:1;background:#FFFDF4;border:5px solid var(--ink);border-radius:40px;box-shadow:14px 14px 0 var(--ink);padding:50px 54px;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;font-size:30px;font-weight:700;color:#C8930A;margin-bottom:30px"><span>‹ Notas</span><span>•••</span></div>
      <h1 style="font-size:76px;margin-bottom:46px">${esc(p.titulo)}</h1>
      <div style="display:grid;gap:34px;font-size:52px;font-weight:600;line-height:1.15">
        ${p.linhas.map((l, i) => `<div>${i + 1}. ${esc(l)}</div>`).join('')}
      </div>
      <div style="flex:1"></div>
      <div class="hand" style="font-size:66px;color:var(--mag);transform:rotate(-3deg);align-self:flex-end">${esc(p.rodape)}</div>
    </div>
    <div style="height:46px"></div>
    ${foot()}
  </div>`];

T.meme = p => {
  const c = CORES[p.cor || 'mag'];
  return [`<div class="ad" style="background:${c.bg};color:${c.t}">
    ${top(c)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px;gap:46px">
      <p style="font-size:${fit(p.setup, [[50, 64], [9999, 54]])}px;font-weight:700;line-height:1.2;opacity:.92">${esc(p.setup)}</p>
      <div class="card" style="padding:56px 56px 62px"><h1 style="font-size:${fit(p.punch)}px;line-height:1.05">${esc(p.punch)}</h1></div>
    </div>
    ${foot('Envia ao amigo que precisa disto')}
  </div>`];
};

T.bloqueada = p => [`<div class="ad" style="background:var(--tan)">
    ${top({ t: '#fff' })}
    <div style="padding:36px 64px 0"><h1 style="font-size:${fit(p.titulo, [[50, 88], [9999, 76]])}px;color:#fff">${esc(p.titulo)}</h1></div>
    <div style="flex:1;display:grid;gap:26px;padding:44px 64px;align-content:start">
      <div class="card" style="padding:32px 38px"><div style="font-weight:800;font-size:30px;color:var(--mag);margin-bottom:10px">#1</div>
        <p style="font-size:44px;font-weight:700;line-height:1.16">“${esc(p.visivel)}”</p></div>
      ${p.bloqueadas.map((b, i) => `<div style="background:#fff;border:5px solid var(--ink);border-radius:40px;padding:32px 38px;position:relative;overflow:hidden">
        <div style="font-weight:800;font-size:30px;color:var(--mag);margin-bottom:10px">#${i + 2}</div>
        <p style="font-size:44px;font-weight:700;filter:blur(14px)">${esc(b)}</p>
        <div style="position:absolute;inset:0;display:grid;place-items:center;font-size:42px;font-weight:800;background:rgba(255,255,255,.55)">🔒 Comenta DEIXA</div></div>`).join('')}
    </div>
    ${foot(esc(p.rodape || '+ 98 deixas por situação'))}
  </div>`];

// Diálogo curto (deixa que funcionou), feito para "marca quem usaria isto"
T.dialogo = p => {
  const c = CORES[p.cor || 'mag'];
  return [`<div class="ad" style="background:${c.bg};color:${c.t}">
    ${top(c, `<span class="pill">${esc(p.eyebrow || 'Deixa aprovada')}</span>`)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:30px;padding:0 64px">
      ${p.falas.map(f => f.quem === 'ela'
        ? `<div class="card" style="align-self:flex-end;max-width:86%;padding:34px 40px;border-radius:40px 40px 10px 40px;background:var(--sol)"><div style="font-size:26px;font-weight:800;opacity:.6;margin-bottom:8px">ELA</div><h2 style="font-size:${fit(f.txt, [[20, 74], [50, 62], [9999, 52]])}px;line-height:1.08">${esc(f.txt)}</h2></div>`
        : `<div class="card" style="align-self:flex-start;max-width:86%;padding:34px 40px;border-radius:40px 40px 40px 10px"><div style="font-size:26px;font-weight:800;opacity:.6;margin-bottom:8px">ELE</div><h2 style="font-size:${fit(f.txt, [[20, 74], [50, 62], [9999, 52]])}px;line-height:1.08">${esc(f.txt)}</h2></div>`).join('')}
    </div>
    ${foot(esc(p.rodape || 'Marca quem tinha lata para dizer isto'))}
  </div>`];
};

// Post em estilo "tweet" (cartão genérico da marca, sem logótipos de outras redes)
T.tweet = p => {
  const c = CORES[p.cor || 'plum'];
  return [`<div class="ad" style="background:${c.bg};justify-content:center;padding:0 60px">
    <div class="card" style="padding:56px 56px 50px">
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:34px">
        <div style="width:92px;height:92px;border-radius:50%;background:var(--mag);display:grid;place-items:center;border:4px solid var(--ink)"><div style="width:70px;height:70px">${CAP}</div></div>
        <div><div style="font-weight:800;font-size:38px">Zero Tampas</div><div style="font-size:30px;color:#7a6a7d">@zerotampas</div></div>
      </div>
      <p style="font-size:${fit(p.texto, [[60, 70], [110, 60], [170, 52], [9999, 46]])}px;font-weight:600;line-height:1.24;white-space:pre-line">${esc(p.texto)}</p>
      <div style="margin-top:34px;font-size:28px;color:#7a6a7d">${esc(p.hora || '')} · Lisboa</div>
    </div>
  </div>`];
};

// "Marca alguém que…" — relatável, gera comentários com marcações
T.marca = p => {
  const c = CORES[p.cor || 'tan'];
  return [`<div class="ad" style="background:${c.bg};color:${c.t}">
    ${top(c)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 64px;gap:40px">
      <span class="pill" style="align-self:flex-start;font-size:40px;padding:12px 30px;transform:rotate(-3deg)">Marca alguém</span>
      <h1 style="font-size:${fit(p.texto, [[50, 104], [90, 88], [130, 76], [9999, 66]])}px;line-height:1.02">${esc(p.texto)}</h1>
    </div>
    ${foot('Marca nos comentários 👇')}
  </div>`];
};

// Versão story 9:16: o post dentro da moldura da marca, para empurrar para o feed
const storyHTML = (img, cor) => {
  const c = CORES[cor || 'mag'];
  return `<div style="width:1080px;height:1920px;background:${c.bg};color:${c.t};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;font-family:B,sans-serif">
    <div style="display:flex;align-items:center;gap:16px;font-weight:800;font-size:44px"><span style="width:70px;height:70px;display:block">${CAP}</span>Novo post</div>
    <img src="file://${img}" style="width:900px;border:8px solid #2A0B2D;border-radius:36px;box-shadow:20px 20px 0 #2A0B2D">
    <div style="font-family:H;font-weight:700;font-size:78px;color:${c.acc};transform:rotate(-3deg)">vai ao feed e envia a um amigo ↗</div>
    <div style="font-weight:700;font-size:34px;opacity:.8">@zerotampas</div>
  </div>`;
};

// ---------- FILA ----------
// Converte data+hora de Lisboa num instante UTC (trata horário de verão automaticamente)
function lisboaParaUTC(data, hora) {
  const [y, m, d] = data.split('-').map(Number), [hh, mm] = hora.split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess));
    const g = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const shown = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour % 24, +g.minute);
    guess += Date.UTC(y, m - 1, d, hh, mm) - shown;
  }
  return new Date(guess).toISOString();
}

(async () => {
  const fonte = process.argv[2];
  if (!fonte) { console.error('Uso: node gerar.js conteudo/semana-01.json'); process.exit(1); }
  const lote = JSON.parse(fs.readFileSync(path.resolve(ROOT, fonte), 'utf8'));
  const pasta = `semana-${String(lote.semana).padStart(2, '0')}`;
  const outDir = path.join(ROOT, 'saida', pasta);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'fila'), { recursive: true });

  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const tmp = path.join(ROOT, '.tmp.html');

  const filaPath = path.join(ROOT, 'fila', 'fila.json');
  const fila = fs.existsSync(filaPath) ? JSON.parse(fs.readFileSync(filaPath, 'utf8')) : [];
  const ids = new Set(fila.map(f => f.id));

  for (const p of lote.posts) {
    if (!T[p.template]) throw new Error(`Template desconhecido: ${p.template} (${p.id})`);
    if ((p.hashtags || []).length > 5) throw new Error(`${p.id}: mais de 5 hashtags (limite do Instagram)`);
    const slides = T[p.template](p);
    const imagens = [];
    for (let i = 0; i < slides.length; i++) {
      fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${BASE}</style>${slides[i]}`);
      await page.goto('file://' + tmp);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const nome = `${p.id}-${String(i + 1).padStart(2, '0')}.jpg`;
      await page.screenshot({ path: path.join(outDir, nome), type: 'jpeg', quality: 92 });
      imagens.push(`saida/${pasta}/${nome}`);
    }
    const legenda = `${p.legenda}\n\n${(p.hashtags || []).join(' ')}`;
    const item = { id: p.id, quando_lisboa: `${p.data} ${p.hora}`, quando_utc: lisboaParaUTC(p.data, p.hora), tipo: imagens.length > 1 ? 'CAROUSEL' : 'IMAGE', imagens, legenda, publicado: false };
    const novos = [item];
    if (p.story) {
      const sp = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
      fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${BASE} body{width:1080px;height:1920px}</style>${storyHTML(path.join(ROOT, imagens[0]), p.cor)}`);
      await sp.goto('file://' + tmp); await sp.evaluate(() => document.fonts.ready); await sp.waitForTimeout(150);
      const nome = `${p.id}-story.jpg`;
      await sp.screenshot({ path: path.join(outDir, nome), type: 'jpeg', quality: 90 });
      await sp.close();
      const t = new Date(new Date(item.quando_utc).getTime() + 10 * 60000).toISOString();
      novos.push({ id: `${p.id}-story`, quando_lisboa: `${p.data} ${p.hora} +10min`, quando_utc: t, tipo: 'STORY', imagens: [`saida/${pasta}/${nome}`], legenda: '', publicado: false });
    }
    for (const it of novos) {
      if (ids.has(it.id)) { const k = fila.findIndex(f => f.id === it.id); if (!fila[k].publicado) fila[k] = it; }
      else fila.push(it);
    }
    console.log(`✓ ${p.id} · ${imagens.length} imagem(ns)${p.story ? ' + story' : ''}`);
  }
  fila.sort((a, b) => a.quando_utc.localeCompare(b.quando_utc));
  fs.writeFileSync(filaPath, JSON.stringify(fila, null, 2));
  const csv = ['data_lisboa,hora_lisboa,tipo,imagens,legenda'].concat(fila.map(f => {
    const [d, h] = f.quando_lisboa.split(' ');
    return [d, h, f.tipo, f.imagens.join(' | '), '"' + f.legenda.replace(/"/g, '""') + '"'].join(',');
  }));
  fs.writeFileSync(path.join(ROOT, 'fila', 'fila.csv'), csv.join('\n'));
  fs.unlinkSync(tmp);
  await browser.close();
  console.log(`\nFila: ${fila.length} posts · ${fila.filter(f => !f.publicado).length} por publicar`);
})();
