// Zero Tampas · Estado da operação: fila, pausa, ritmo e quanto conteúdo falta.
// Uso: node ferramentas/estado.js            (resumo legível)
//      node ferramentas/estado.js --json     (para scripts / Claude)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const fila = JSON.parse(fs.readFileSync(path.join(ROOT, 'fila', 'fila.json'), 'utf8'));
const agora = new Date(process.env.AGORA || Date.now());
const iso = agora.toISOString();
const lisboa = d => new Date(d).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const pausa = fs.existsSync(path.join(ROOT, 'PAUSA')) ? fs.readFileSync(path.join(ROOT, 'PAUSA'), 'utf8').trim() : null;
const publicados = fila.filter(f => f.publicado === true);
const falhados = fila.filter(f => f.publicado === 'falhou');
const cancelados = fila.filter(f => f.publicado === 'cancelado');
const expirados = fila.filter(f => f.publicado === 'expirado');
const manuais = fila.filter(f => f.publicado === 'manual');
const pendentes = fila.filter(f => !f.publicado);
const atrasados = pendentes.filter(f => f.quando_utc < new Date(agora - 45 * 60000).toISOString());
const ha24h = new Date(agora - 864e5).toISOString();
const ult24 = publicados.filter(f => (f.publicado_em || '') >= ha24h).length;
const ultimo = pendentes.length ? pendentes[pendentes.length - 1].quando_utc : (publicados.at(-1)?.quando_utc || null);
const diasRestantes = ultimo ? Math.max(0, (new Date(ultimo) - agora) / 864e5) : 0;
const semanas = [...new Set(fila.map(f => (f.imagens[0].match(/semana-(\d+)/) || [])[1]).filter(Boolean))].map(Number).sort((a, b) => a - b);
const comErro = pendentes.filter(f => f.erro);

const r = {
  agora: iso, pausa, total: fila.length, publicados: publicados.length, pendentes: pendentes.length,
  falhados: falhados.map(f => ({ id: f.id, erro: f.erro })), cancelados: cancelados.length, expirados: expirados.map(f => f.id), manuais: manuais.length,
  atrasados: atrasados.map(f => f.id), publicados_24h: ult24, max_por_dia: Number(process.env.MAX_POR_DIA || 15),
  ultima_publicacao_agendada: ultimo, dias_de_conteudo_restantes: +diasRestantes.toFixed(1),
  semanas_na_fila: semanas, proxima_semana: (semanas.at(-1) || 0) + 1,
  precisa_semana_nova: diasRestantes < 4,
  com_erro_a_tentar: comErro.map(f => ({ id: f.id, tentativas: f.tentativas, erro: (f.erro || '').slice(0, 160) })),
  proximos: pendentes.slice(0, 6).map(f => ({ id: f.id, quando: lisboa(f.quando_utc), tipo: f.tipo })),
};

if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }

console.log(`Zero Tampas · estado em ${lisboa(iso)} (Lisboa)\n`);
console.log(pausa ? `⛔ PAUSA ATIVA: ${pausa}\n   Para retomar: esperar 24–48 h, baixar MAX_POR_DIA e apagar o ficheiro PAUSA.\n` : '✅ Publicação ativa (sem PAUSA)\n');
console.log(`Fila: ${r.total} itens · ${r.publicados} publicados · ${r.pendentes} por publicar · ${falhados.length} falhados · ${r.cancelados} cancelados · ${expirados.length} expirados · ${manuais.length} manuais`);
console.log(`Últimas 24 h: ${ult24}/${r.max_por_dia} publicações`);
console.log(`Semanas na fila: ${semanas.join(', ') || '—'} · conteúdo até ${ultimo ? lisboa(ultimo) : '—'} (${r.dias_de_conteudo_restantes} dias)`);
if (r.precisa_semana_nova) console.log(`⚠️  Falta pouco conteúdo: gerar a semana ${r.proxima_semana} (/gerar-semana).`);
if (atrasados.length) console.log(`⚠️  ${atrasados.length} posts atrasados (a hora já passou há +45 min): ${r.atrasados.slice(0, 5).join(', ')}${atrasados.length > 5 ? '…' : ''}`);
for (const f of comErro) console.log(`⚠️  ${f.id}: ${f.tentativas} tentativa(s) · ${(f.erro || '').slice(0, 120)}`);
for (const f of falhados) console.log(`✗ falhou: ${f.id} · ${(f.erro || '').slice(0, 120)}`);
console.log('\nPróximos:');
for (const p of r.proximos) console.log(`  ${p.quando}  ${p.tipo.padEnd(8)} ${p.id}`);
