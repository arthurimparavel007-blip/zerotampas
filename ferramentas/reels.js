// Zero Tampas · gerador de Reels (1080x1920, 30 fps, H.264 + AAC) a partir dos posts de uma semana.
// Cada template vira uma cena animada + alerta «Segue e partilha» a meio + cartão final de marca.
// A trilha é original (ferramentas/trilha.py), por isso não há risco de direitos de autor.
//
// Uso: node ferramentas/reels.js conteudo/semana-01.json [id1 id2 ...]
//   → saida/semana-NN/reels/<id>.mp4  (+ <id>.json com a duração e o thumb_offset)
// Requer: ffmpeg e python3 com numpy + scipy. CHROME_PATH opcional.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const FONTS = path.join(ROOT, 'node_modules', '@fontsource');
const W = 1080, H = 1920, FPS = 30;
const CAP = `<svg viewBox="0 0 100 100"><polygon points="50.0,2.0 56.3,8.0 64.1,4.1 68.4,11.7 77.0,10.3 78.9,18.8 87.5,20.1 86.8,28.8 94.7,32.5 91.4,40.5 97.9,46.4 92.4,53.2 96.8,60.7 89.6,65.5 91.6,74.0 83.2,76.5 82.6,85.2 73.9,85.1 70.8,93.2 62.5,90.6 57.2,97.5 50.0,92.5 42.8,97.5 37.5,90.6 29.2,93.2 26.1,85.1 17.4,85.2 16.8,76.5 8.4,74.0 10.4,65.5 3.2,60.7 7.6,53.2 2.1,46.4 8.6,40.5 5.3,32.5 13.2,28.8 12.5,20.1 21.1,18.8 23.0,10.3 31.6,11.7 35.9,4.1 43.7,8.0" fill="#FFD84A" stroke="#2A0B2D" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="50" r="30" fill="#FF7A2F" stroke="#2A0B2D" stroke-width="4"/><line x1="16" y1="84" x2="84" y2="16" stroke="#FF2D87" stroke-width="11" stroke-linecap="round"/></svg>`;
const CORES = {
  mag: { bg: '#FF2D87', t: '#FFFFFF', acc: '#FFD84A' },
  tan: { bg: '#FF7A2F', t: '#FFFFFF', acc: '#2A0B2D' },
  sol: { bg: '#FFD84A', t: '#2A0B2D', acc: '#FF2D87' },
  plum: { bg: '#3E0F45', t: '#FFFFFF', acc: '#FFD84A' },
};

const CSS = `
@font-face{font-family:B;src:url(file://${FONTS}/bricolage-grotesque/files/bricolage-grotesque-latin-400-normal.woff2);font-weight:400}
@font-face{font-family:B;src:url(file://${FONTS}/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2);font-weight:700}
@font-face{font-family:B;src:url(file://${FONTS}/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2);font-weight:800}
@font-face{font-family:H;src:url(file://${FONTS}/caveat/files/caveat-latin-700-normal.woff2);font-weight:700}
:root{--ink:#2A0B2D;--blush:#FFEAF2;--mag:#FF2D87;--tan:#FF7A2F;--sol:#FFD84A;--plum:#3E0F45}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:B,'Noto Color Emoji',sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.stage{position:absolute;inset:0;overflow:hidden}
.top{position:absolute;top:210px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:18px;font-weight:800;font-size:44px}
.brand i{width:76px;height:76px;display:block}
.pill{background:#fff;color:var(--ink);border:5px solid var(--ink);border-radius:999px;padding:12px 30px;font-weight:800;font-size:36px;white-space:nowrap}
.card{background:#fff;color:var(--ink);border:6px solid var(--ink);border-radius:44px;box-shadow:14px 14px 0 var(--ink)}
.hand{font-family:H;font-weight:700}
.zone{position:absolute;left:72px;right:72px;top:400px;height:1040px;display:flex;flex-direction:column;justify-content:center;gap:40px}
.lbl{font-size:30px;font-weight:800;opacity:.55;margin-bottom:8px}
.toast{position:absolute;left:40px;right:40px;top:1470px;display:flex;justify-content:center}
.toast div{background:var(--ink);color:#fff;border:5px solid #fff;border-radius:999px;padding:22px 40px;font-size:44px;font-weight:800;box-shadow:0 10px 0 rgba(0,0,0,.25);white-space:nowrap}
.toast b{color:var(--sol)}
`;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fit = (s, tab) => { const n = String(s).length; for (const [m, px] of tab) if (n <= m) return px; return tab[tab.length - 1][1]; };
const ler = s => Math.min(4.5, 0.9 + String(s).length / 22); // segundos para ler um texto

function topo(c, pill) {
  return `<div class="top"><div class="brand" style="color:${c.t}"><i>${CAP}</i>Zero Tampas</div>${pill ? `<div class="pill" data-in="0.1" data-fx="pop">${pill}</div>` : ''}</div>`;
}
function bolha(quem, txt, t) {
  const ela = quem === 'ela';
  return `<div class="card" data-in="${t}" data-fx="pop" style="align-self:${ela ? 'flex-end' : 'flex-start'};max-width:88%;padding:38px 44px;border-radius:${ela ? '48px 48px 12px 48px' : '48px 48px 48px 12px'};${ela ? 'background:var(--sol)' : ''}">
    <div class="lbl">${ela ? 'ELA' : 'ELE'}</div><div style="font-size:${fit(txt, [[15, 92], [40, 74], [70, 64], [9999, 56]])}px;font-weight:800;line-height:1.08" data-type="${t}">${esc(txt)}</div></div>`;
}
function pagina(t0, t1, inner) {
  return `<div class="zone" data-in="${t0}" ${t1 ? `data-out="${t1}"` : ''} data-fx="up">${inner}</div>`;
}

// Cada cena devolve {html, fim (s, conteúdo completo), sfx:[[t, tipo]], bg?, ultimaSaida?}
const CENA = {
  deixa(p, c) {
    const t = 0.9;
    return { html: topo(c, p.numero ? `Deixa do dia #${p.numero}` : 'Deixa') + pagina(0.3, 0, `
      <div class="hand" style="font-size:120px;color:${c.acc};transform:rotate(-3deg)">${esc(p.local)}</div>
      <div class="card" data-in="${t}" data-fx="pop" style="padding:90px 60px 96px;position:relative">
        <div style="position:absolute;top:-82px;left:40px;font-size:220px;font-weight:800;line-height:1;color:${c.acc};-webkit-text-stroke:6px var(--ink)">“</div>
        <div style="font-size:${fit(p.frase, [[50, 100], [90, 88], [130, 76], [9999, 66]])}px;font-weight:800;line-height:1.06" data-type="${t + 0.2}">${esc(p.frase)}</div></div>`),
      fim: t + 0.4 + ler(p.frase), sfx: [[t, 1]] };
  },
  dialogo(p, c) {
    let t = 0.9; const sfx = []; let h = '';
    for (const f of p.falas) { h += bolha(f.quem, f.txt, t); sfx.push([t, 1]); t += 0.5 + ler(f.txt) * 0.8; }
    return { html: topo(c, esc(p.eyebrow || 'Deixa aprovada')) + pagina(0.2, 0, h), fim: t + 0.6, sfx };
  },
  tweet(p, c) {
    const t = 0.6;
    return { html: topo(c) + pagina(0.2, 0, `<div class="card" data-in="${t}" data-fx="pop" style="padding:60px 56px">
      <div style="display:flex;align-items:center;gap:22px;margin-bottom:36px"><div style="width:110px;height:110px;border-radius:50%;background:var(--mag);display:grid;place-items:center;border:5px solid var(--ink)"><div style="width:84px;height:84px">${CAP}</div></div>
      <div><div style="font-weight:800;font-size:46px">Zero Tampas</div><div style="font-size:36px;color:#7a6a7d">@zerotampas</div></div></div>
      <div style="font-size:${fit(p.texto, [[60, 80], [110, 68], [170, 58], [9999, 50]])}px;font-weight:600;line-height:1.24;white-space:pre-line" data-type="${t + 0.3}">${esc(p.texto)}</div></div>`),
      fim: t + 0.5 + ler(p.texto), sfx: [[t, 1]] };
  },
  marca(p, c) {
    const t = 0.9;
    return { html: topo(c) + pagina(0.2, 0, `<div class="pill" data-in="0.4" data-fx="pop" style="align-self:flex-start;font-size:48px;padding:14px 36px">Marca alguém 👇</div>
      <div style="font-size:${fit(p.texto, [[50, 112], [90, 96], [130, 84], [9999, 72]])}px;font-weight:800;line-height:1.02;color:${c.t}" data-type="${t}">${esc(p.texto)}</div>`),
      fim: t + ler(p.texto), sfx: [[0.4, 1]] };
  },
  meme(p, c) {
    const t2 = 0.6 + ler(p.setup);
    return { html: topo(c) + pagina(0.2, 0, `<div style="font-size:${fit(p.setup, [[50, 72], [9999, 60]])}px;font-weight:700;line-height:1.2;color:${c.t}" data-type="0.5">${esc(p.setup)}</div>
      <div class="card" data-in="${t2}" data-fx="pop" style="padding:60px 56px"><div style="font-size:${fit(p.punch, [[40, 104], [65, 90], [90, 78], [9999, 64]])}px;font-weight:800;line-height:1.05">${esc(p.punch)}</div></div>`),
      fim: t2 + ler(p.punch), sfx: [[t2, 2]] };
  },
  notas(p) {
    let t = 1.0; const sfx = []; let li = '';
    for (const l of p.linhas) { li += `<div data-in="${t}" data-fx="up" style="font-size:${fit(l, [[30, 56], [60, 48], [9999, 42]])}px;font-weight:600;line-height:1.3;padding:14px 0;border-bottom:3px dashed #e5d9a8">${esc(l)}</div>`; sfx.push([t, 1]); t += 0.4 + ler(l) * 0.6; }
    return { html: topo({ t: '#2A0B2D' }) + pagina(0.2, 0, `<div class="card" style="padding:50px 56px;background:#FFFBEA">
      <div style="font-size:34px;font-weight:800;color:#c8a400;margin-bottom:16px">📝 Notas</div>
      <div style="font-size:${fit(p.titulo, [[40, 72], [9999, 60]])}px;font-weight:800;line-height:1.05;margin-bottom:20px">${esc(p.titulo)}</div>${li}
      ${p.rodape ? `<div data-in="${t}" data-fx="up" style="margin-top:24px;font-size:40px;font-weight:800;color:var(--mag)">${esc(p.rodape)}</div>` : ''}</div>`), fim: t + 0.8, sfx, bg: '#FFD84A' };
  },
  chat(p) {
    let t = 0.9; const sfx = []; let a = '', d = '';
    const msg = (m, tt) => `<div data-in="${tt}" data-fx="pop" style="align-self:${m.de === 'eu' ? 'flex-end' : 'flex-start'};max-width:82%;background:${m.de === 'eu' ? 'var(--mag)' : '#fff'};color:${m.de === 'eu' ? '#fff' : 'var(--ink)'};border-radius:36px;padding:22px 32px;font-size:${fit(m.txt, [[30, 50], [9999, 42]])}px;font-weight:700;border:4px solid var(--ink)">${esc(m.txt)}</div>`;
    for (const m of p.antes) { a += msg(m, t); sfx.push([t, 1]); t += 0.4 + ler(m.txt) * 0.5; }
    const tRot = t + 0.3; const tD = tRot + 1.3; t = tD + 0.3;
    for (const m of p.depois) { d += msg(m, t); sfx.push([t, 1]); t += 0.4 + ler(m.txt) * 0.5; }
    return { html: topo({ t: '#fff' }) +
      pagina(0.2, tD, `<div style="font-size:60px;font-weight:800;color:#fff;line-height:1.05">${esc(p.titulo)}</div><div style="font-size:44px;font-weight:800;color:#fff">❌ Assim não</div>${a}<div data-in="${tRot}" data-fx="stamp" style="align-self:center;border:8px solid var(--sol);color:var(--sol);font-size:56px;font-weight:800;padding:6px 26px;border-radius:18px">${esc(p.antes_rodape || 'VISTO 💀')}</div>`) +
      pagina(tD, 0, `<div style="font-size:60px;font-weight:800;color:#fff;line-height:1.05">${esc(p.titulo)}</div><div style="font-size:44px;font-weight:800;color:var(--sol)">✅ Assim sim</div>${d}`), fim: t + 0.6, sfx: [...sfx, [tRot, 2]], bg: '#3E0F45' };
  },
  lista(p, c) {
    let t = 0.2; const sfx = []; let h = '';
    const capaFim = t + 0.6 + ler(p.capa.titulo);
    h += pagina(t, capaFim, `<span class="pill" style="align-self:flex-start">${esc(p.capa.eyebrow)}</span><div style="font-size:${fit(p.capa.titulo, [[30, 130], [45, 116], [60, 104], [9999, 92]])}px;font-weight:800;line-height:.98;color:${c.t}">${esc(p.capa.titulo)}</div>`);
    t = capaFim; const n = p.itens.length;
    p.itens.forEach((it, i) => {
      const f = t + 0.5 + ler(it.titulo) + (it.nota ? ler(it.nota) * 0.5 : 0);
      h += pagina(t, f, `<div style="font-size:56px;font-weight:800;color:${c.t}">${i + 1}/${n}</div><div class="card" style="padding:60px 54px"><div style="font-size:${fit(it.titulo, [[30, 92], [60, 78], [100, 66], [9999, 58]])}px;font-weight:800;line-height:1.06">${esc(it.titulo)}</div>${it.nota ? `<div style="margin-top:26px;font-size:44px;font-weight:600;opacity:.75">${esc(it.nota)}</div>` : ''}</div>`);
      sfx.push([t, 1]); t = f;
    });
    if (p.dica) { const f = t + 0.5 + ler(p.dica.texto); h += pagina(t, f, `<div class="hand" style="font-size:110px;color:${c.acc}">${esc(p.dica.titulo)}</div><div style="font-size:${fit(p.dica.texto, [[80, 72], [9999, 60]])}px;font-weight:800;line-height:1.1;color:${c.t}">${esc(p.dica.texto)}</div>`); sfx.push([t, 2]); t = f; }
    return { html: topo(c) + h, fim: t, sfx, ultimaSaida: true };
  },
  vs(p, c) {
    let t = 0.2; const sfx = []; let h = '';
    const capaFim = t + 0.6 + ler(p.capa.titulo);
    h += pagina(t, capaFim, `<span class="pill" style="align-self:flex-start">${esc(p.capa.eyebrow)}</span><div style="font-size:${fit(p.capa.titulo, [[30, 124], [50, 108], [9999, 92]])}px;font-weight:800;line-height:1;color:${c.t}">${esc(p.capa.titulo)}</div>`);
    t = capaFim;
    p.pares.forEach(pr => {
      const tf = t + 0.4 + ler(pr.foleiro) * 0.7, f = tf + 0.6 + ler(pr.fixe);
      h += pagina(t, f, `<div class="card" style="padding:40px 48px"><div style="font-size:38px;font-weight:800;color:#c0392b">❌ FOLEIRO</div><div style="font-size:${fit(pr.foleiro, [[30, 76], [9999, 60]])}px;font-weight:800;margin-top:8px">${esc(pr.foleiro)}</div></div>
        <div class="card" data-in="${tf}" data-fx="pop" style="padding:40px 48px;background:var(--sol)"><div style="font-size:38px;font-weight:800;color:#1e7d3a">✅ FIXE</div><div style="font-size:${fit(pr.fixe, [[40, 72], [90, 62], [9999, 54]])}px;font-weight:800;line-height:1.08;margin-top:8px">${esc(pr.fixe)}</div></div>`);
      sfx.push([t, 1], [tf, 2]); t = f;
    });
    return { html: topo(c) + h, fim: t, sfx, ultimaSaida: true };
  },
  bloqueada(p) {
    const t = 1.0;
    return { html: topo({ t: '#fff' }) + pagina(0.2, 0, `<div style="font-size:${fit(p.titulo, [[50, 88], [9999, 74]])}px;font-weight:800;color:#fff;line-height:1">${esc(p.titulo)}</div>
      <div class="card" data-in="${t}" data-fx="pop" style="padding:40px 46px"><div style="font-weight:800;font-size:34px;color:var(--mag)">#1</div><div style="font-size:56px;font-weight:800;line-height:1.12">“${esc(p.visivel)}”</div></div>
      ${p.bloqueadas.map((b, i) => `<div class="card" data-in="${t + 1.6 + i * 0.6}" data-fx="pop" style="padding:40px 46px;position:relative;overflow:hidden"><div style="font-weight:800;font-size:34px;color:var(--mag)">#${i + 2}</div><div style="font-size:56px;font-weight:800;filter:blur(16px)">${esc(b)}</div><div style="position:absolute;inset:0;display:grid;place-items:center;font-size:52px;font-weight:800;background:rgba(255,255,255,.55)">🔒 Comenta DEIXA</div></div>`).join('')}`),
      fim: t + 3.4 + ler(p.visivel), sfx: [[t, 1], [t + 1.6, 1], [t + 2.2, 1]], bg: '#FF7A2F' };
  },
};

function fimCard(t, post) {
  let cta = (post.cta === 'seguir' || !post.cta) ? ['Segue @zerotampas', 'uma deixa nova todos os dias 🇵🇹'] : ['Comenta DEIXA', 'e mando-te mais 3 de borla'];
  if (post.template === 'marca') cta = ['Marca quem precisa', 'e segue @zerotampas 🇵🇹'];
  if (/Comenta DEIXA e mando-te 3 de borla/.test(post.legenda || '')) cta = ['Comenta DEIXA', 'e mando-te 3 de borla 👇']; // posts de venda
  if (post.template === 'bloqueada') cta = ['Comenta DEIXA', 'e desbloqueia as outras 👇'];
  return `<div class="stage" data-in="${t}" data-fx="wipe" style="background:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;color:#fff;padding:0 60px">
    <div style="width:300px;height:300px">${CAP}</div>
    <div style="font-size:${cta[0].length > 16 ? 96 : 110}px;font-weight:800;text-align:center;line-height:1">${cta[0]}</div>
    <div class="hand" style="font-size:72px;color:#FFD84A;text-align:center;line-height:1.1">${cta[1]}</div></div>`;
}

const RENDER = `
window.render = (t) => {
  const cl = x => Math.min(Math.max(x, 0), 1), ease = x => 1 - Math.pow(1 - cl(x), 3);
  const back = x => { x = cl(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  document.querySelectorAll('[data-in]').forEach(el => {
    const t0 = +el.dataset.in, t1 = el.dataset.out ? +el.dataset.out : 1e9, fx = el.dataset.fx, p = (t - t0) / 0.35;
    if (t < t0 || t >= t1 + 0.25) { el.style.opacity = 0; return; }
    let o = Math.min(1, p * 1.6), tr = '';
    if (t > t1) { const q = (t - t1) / 0.25; o = 1 - q; tr = 'translateY(' + (-60 * q) + 'px)'; }
    if (fx === 'pop') tr += ' scale(' + (0.6 + 0.4 * back(p)) + ')';
    if (fx === 'up' && t <= t1) tr += ' translateY(' + (60 * (1 - ease(p))) + 'px)';
    if (fx === 'stamp') tr += ' rotate(-8deg) scale(' + (2.2 - 1.2 * ease(p)) + ')';
    if (fx === 'wipe') { o = 1; el.style.clipPath = 'circle(' + (ease(p / 1.4) * 150) + '% at 50% 50%)'; }
    if (fx === 'toast') tr = 'translateY(' + (120 * (1 - back(p))) + 'px) scale(' + (1 + 0.035 * Math.sin(t * 6)) + ')';
    el.style.opacity = o; el.style.transform = tr;
  });
  document.querySelectorAll('[data-type]').forEach(el => {
    if (!el.dataset.full) el.dataset.full = el.textContent;
    const full = el.dataset.full, n = Math.max(0, Math.min(full.length, Math.floor((t - +el.dataset.type) * 30)));
    el.innerHTML = full.slice(0, n) + '<span style="opacity:0">' + full.slice(n) + '</span>';
  });
  const bg = document.querySelector('.bgz'); if (bg) bg.style.transform = 'scale(' + (1 + 0.02 * Math.sin(t * 1.3)) + ')';
};`;

async function gerarUm(page, post, outDir, seed) {
  const padrao = { chat: 'plum', notas: 'sol', bloqueada: 'tan' }[post.template];
  const c = CORES[post.cor] || CORES[padrao] || CORES.mag;
  const cena = CENA[post.template](post, c);
  const tFim = Math.max(cena.fim, 3.2);        // conteúdo completo no ecrã
  const tToast = Math.min(2.2, tFim - 1);      // alerta «Segue e partilha»
  const tCard = tFim + 1.6;                    // cartão final de marca
  const dur = +(tCard + 2.2).toFixed(2);
  let corpo = cena.html;
  if (cena.ultimaSaida) {                      // a última página fica no ecrã até ao cartão final
    const marca = `data-out="${cena.fim}"`, k = corpo.lastIndexOf(marca);
    if (k >= 0) corpo = corpo.slice(0, k) + `data-out="${tCard}"` + corpo.slice(k + marca.length);
  }
  const toast = `<div class="toast" data-in="${tToast}" data-out="${tCard - 0.1}" data-fx="toast"><div>👆 <b>Segue</b> e ↗ <b>partilha</b> com um amigo</div></div>`;
  const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
    <div class="stage bgz" style="background:${cena.bg || c.bg}"></div>
    <div class="stage">${corpo}${toast}${fimCard(tCard, post)}</div><script>${RENDER}</script>`;
  const tmp = path.join(outDir, `.${post.id}.html`); fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp); await page.evaluate(() => document.fonts.ready);
  const fdir = path.join(outDir, `.${post.id}-frames`); fs.mkdirSync(fdir, { recursive: true });
  const total = Math.round(dur * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    await page.screenshot({ path: path.join(fdir, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 88 });
  }
  const sfxFile = path.join(outDir, `.${post.id}-sfx.json`);
  fs.writeFileSync(sfxFile, JSON.stringify({ dur, sfx: [...cena.sfx, [tToast, 2], [tCard, 3]] }));
  const wav = path.join(outDir, `.${post.id}.wav`);
  execFileSync('python3', [path.join(__dirname, 'trilha.py'), sfxFile, wav, String(seed)]);
  const mp4 = path.join(outDir, `${post.id}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(fdir, '%04d.jpg'), '-i', wav,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '21', '-preset', 'medium', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-shortest', '-movflags', '+faststart', mp4]);
  if (!process.env.MANTER_FRAMES) { for (const f of fs.readdirSync(fdir)) fs.unlinkSync(path.join(fdir, f)); fs.rmdirSync(fdir); }
  fs.unlinkSync(tmp); fs.unlinkSync(sfxFile); fs.unlinkSync(wav);
  const meta = { id: post.id, dur, thumb_offset_ms: Math.round((tFim - 0.2) * 1000) };
  fs.writeFileSync(path.join(outDir, `${post.id}.json`), JSON.stringify(meta));
  return meta;
}

(async () => {
  const fonte = process.argv[2]; const so = new Set(process.argv.slice(3));
  if (!fonte) { console.error('Uso: node ferramentas/reels.js conteudo/semana-NN.json [ids...]'); process.exit(1); }
  const lote = JSON.parse(fs.readFileSync(path.resolve(ROOT, fonte), 'utf8'));
  const outDir = path.join(ROOT, 'saida', `semana-${String(lote.semana).padStart(2, '0')}`, 'reels');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  let i = 0;
  for (const post of lote.posts) {
    if (so.size && !so.has(post.id)) continue;
    if (!CENA[post.template]) { console.log('· sem cena para', post.template, post.id); continue; }
    const m = await gerarUm(page, post, outDir, (i++ % 3) + 1);
    console.log(`✓ ${post.id} · ${post.template} · ${m.dur}s`);
  }
  await browser.close();
})();
