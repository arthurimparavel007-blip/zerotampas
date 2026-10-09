// Renova o token de longa duração do Instagram (válido 60 dias). Correr 1x por mês.
// Uso: IG_ACCESS_TOKEN=... node renovar-token.js   → mostra o token novo para colar no Secret do GitHub
(async () => {
  const t = process.env.IG_ACCESS_TOKEN;
  if (!t) { console.error('Defina IG_ACCESS_TOKEN'); process.exit(1); }
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t)}`);
  const j = await r.json();
  if (j.error) { console.error(j.error); process.exit(1); }
  console.log('Token novo (válido por', Math.round(j.expires_in / 86400), 'dias):\n' + j.access_token);
})();
