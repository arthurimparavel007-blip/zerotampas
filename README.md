# Zero Tampas · @zerotampas no piloto automático (Claude Code + GitHub)

Este repositório **é a página**. Trabalha sozinho:

| Quando | Quem | O que faz |
| --- | --- | --- |
| A cada 30 min | GitHub Actions → `publicar.js` | Publica os posts e stories que chegaram à hora, no horário de Lisboa, com travões anti-bloqueio |
| Todas as noites (~23:47) | GitHub Actions → `insights.js` | Lê alcance, partilhas, guardados e seguidores e atualiza `dados/ranking.md` |
| Todas as sextas (~10:07) | **Claude Code** (GitHub Actions) → `/gerar-semana` | Analisa os números, escreve a semana seguinte em PT-PT, valida, gera as imagens, agenda e faz commit |
| Quando quiser | Você, no terminal ou no botão do GitHub | `/status`, `/analisar`, `/gerar-semana`, `/lancamento`, `/testar` |

```
Claude Code (/gerar-semana)
  → conteudo/rascunhos/semana-NN.json
  → ferramentas/agendar.py      (horas, ids, hashtags)
  → ferramentas/validar.py      (PT-PT, respeito, fase, repetidos, volume)
  → gerar.js                    (imagens JPEG + fila/fila.json)
  → git push
       → publicar.yml (30 em 30 min) → Instagram
       → metricas.yml (todas as noites) → dados/ranking.md → próxima sexta
```

## O que já está pronto
- **Semana 0:** 3 posts fixados. São publicados **à mão** de 9 a 11/10, às 20:00, e fixados no perfil: `saida/semana-00/`.
- **Semana 1 (12–18/10):** 52 posts de feed e 21 stories, em rampa de 4 a 10 posts por dia. Fase *crescer*, sem vender. Já estão na fila.
- **Semana 2 (19–25/10, lançamento):** o Claude escreve-a sozinho na sexta, 16/10, seguindo `/lancamento`. Também pode pedi-la antes.
- **Kit do perfil** (foto, destaques, bio): `perfil/`.

---

## Configuração (uma vez, cerca de 1 hora)

### 1. Instagram e Meta (token)
1. Na @zerotampas, mude para **conta profissional → Criador digital**.
2. Em developers.facebook.com, faça **Criar app → Empresa → produto Instagram → «API com login do Instagram»**.
3. Em *Gerar tokens de acesso*, ligue a @zerotampas e peça as permissões `instagram_business_basic` e `instagram_business_content_publish`.
4. Copie o **token** e o **ID da conta**.

Com a app em modo de desenvolvimento, só publica na sua própria conta. É o que queremos, por isso não precisa de revisão da Meta.

### 2. Abrir no Claude Code
```bash
unzip zerotampas-claude-code.zip && cd zerotampas
npm install && npx playwright install chromium
claude
```
O Claude lê o `CLAUDE.md` sozinho e passa a conhecer a marca, as regras, as fases e os comandos.

### 3. Criar o repositório no GitHub (público, para o Instagram conseguir ir buscar as imagens)
Dentro do Claude Code, peça:
> cria um repositório público chamado zerotampas no meu GitHub e envia tudo

O Claude faz isto com `git` e `gh`. Se o `gh` não estiver instalado, use o GitHub Desktop.

O upload pelo site não serve: aceita no máximo 100 ficheiros de cada vez.

### 4. Segredos e app do Claude no GitHub
No Claude Code, corra:
```
/install-github-app
```
Este comando instala a app do Claude no repositório e cria o segredo `CLAUDE_CODE_OAUTH_TOKEN` (plano Pro/Max). Se preferir uma chave da API, use `ANTHROPIC_API_KEY` e troque a linha no `claude-semana.yml`.

Depois, em **Settings → Secrets and variables → Actions**, acrescente:

| Secret | Valor |
| --- | --- |
| `IG_USER_ID` | ID da conta do Instagram (opcional: se não o encontrar, deixe por criar, o robô descobre-o pelo token) |
| `IG_ACCESS_TOKEN` | o token |

### 5. Ligar e testar
1. Vá ao separador **Actions** e ative os workflows.
2. Corra o ensaio sem publicar. No terminal, use `/testar`. No GitHub, abra **Publicar posts Zero Tampas → Run workflow**: nesta altura ainda não há nada para publicar, por isso só confirma que está tudo ligado.
3. A partir de **segunda, 12/10, às 08:30**, a página publica sozinha.

### 6. Antes do lançamento (até domingo, 18/10)
1. Configure o ManyChat. A palavra **DEIXA** responde com 3 deixas de borla e o link.
2. Crie o checkout (MB WAY, Multibanco, cartão) e ponha o link na bio.
3. Atualize `config/produto.json`: preencha `link_checkout` e mude `manychat_ativo` para `true`. Faça o commit. Também pode pedir ao Claude: *«o checkout é https://… e o ManyChat já está ativo»*.

**Sem link, o Claude não escreve «link na bio».** O validador bloqueia, e a venda fica só pelo «comenta DEIXA».

---

## Comandos do Claude Code

| Comando | O que faz |
| --- | --- |
| `/status` | Está a publicar? Mostra a pausa, os erros, os próximos posts e quantos dias de conteúdo faltam |
| `/analisar` | Ranking do que funciona (partilhas, guardados, horas, cores, formatos) e atualização de `dados/aprendizados.md` |
| `/gerar-semana` ou `/gerar-semana 3` | Escreve, valida, gera, agenda e faz commit da semana seguinte, ou da semana indicada |
| `/lancamento` | Guia da fase de venda. Também serve para preparar a semana 2 mais cedo |
| `/testar` | Ensaio completo contra uma API falsa, sem publicar nada |

Também pode falar normalmente:
- *«muda a deixa de amanhã às 08:00»*
- *«cancela os posts de sábado à noite»*
- *«baixa para 8 posts por dia»*
- *«faz uma semana especial de Santos Populares»*

**Pelo GitHub (sem computador):** em Actions, abra **Claude Code · semana nova → Run workflow** e escreva o comando (por exemplo `/analisar`).

## Travões anti-bloqueio (já ativos)
- **Teto diário:** `MAX_POR_DIA` = 15 publicações (feed + stories) em 24 h. A API permite 100.
- **Quota oficial:** antes de publicar, o publicador lê `content_publishing_limit` e pára a 5 publicações do limite.
- **Pausa automática:** se a Meta devolver um erro de limite, spam ou bloqueio, o publicador cria o ficheiro `PAUSA` e pára. Para retomar:
  1. espere 24–48 h;
  2. baixe `MAX_POR_DIA` em `publicar.yml`;
  3. apague `PAUSA` (ou peça ao Claude).
- **Sem rajadas:**
  - no máximo 2 publicações por execução;
  - os posts com mais de 3 h de atraso ficam marcados como `expirado` e não saem todos de uma vez;
  - os posts saem com pelo menos 45 min de intervalo, entre as 07:30 e as 23:30.
- **Validador:** bloqueia português do Brasil, conteúdo desrespeitoso, venda na fase *crescer*, frases repetidas, mais de 5 hashtags e carrosséis com mais de 10 slides.
- **Conteúdo 100% original.** Contas que repostam conteúdo alheio deixaram de ser recomendadas desde abril de 2026.

## Cancelar ou mudar um post à mão
Em `fila/fila.json`, troque `"publicado": false` por `"publicado": "cancelado"` e faça o commit. Para mudar o texto, peça ao Claude, que edita o rascunho e volta a gerar.

## Manutenção
- **Token da Meta (60 dias):** renove-o uma vez por mês e cole o resultado no Secret `IG_ACCESS_TOKEN`.
  ```
  IG_ACCESS_TOKEN=token_atual node renovar-token.js
  ```
- **Fica sem publicar há muito tempo?** O GitHub desliga os workflows agendados ao fim de 60 dias sem atividade. Com o bot a fazer commits, isso não acontece.

## Templates
São 10: `deixa`, `lista`, `vs`, `chat`, `notas`, `meme`, `bloqueada`, `dialogo`, `tweet` e `marca`. Os campos de cada um estão no `CLAUDE.md`.

As cores são `mag`, `tan`, `sol` e `plum`. Para gerar as imagens à mão:
```
node gerar.js conteudo/semana-NN.json
```
