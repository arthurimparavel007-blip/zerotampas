# Zero Tampas · página @zerotampas (Instagram, Portugal)

Este repositório **é a página**. Aqui o Claude Code faz quatro coisas:
- escreve o conteúdo de cada semana;
- gera as imagens;
- agenda os horários de Lisboa;
- lê as métricas para decidir o que repetir.

A publicação é feita pelo GitHub Actions através da API oficial da Meta.

O dono fala português do Brasil, por isso explica-lhe as coisas em PT-BR. **Tudo o que vai para o Instagram é em português de Portugal.**

## Missão
Fazer da @zerotampas a página de referência em Portugal para homens que querem ter lata para meter conversa com uma miúda, com humor e com respeito. Primeiro cresce (alcance, partilhas, seguidores). Depois vende o guia *Zero Tampas: 101 deixas que não são foleiras* (12,90 €, de 57 €) através da palavra-chave **DEIXA** no ManyChat.

## Fases (decididas pelo número da semana)

| Semana | Fase | Objetivo | Regras |
| --- | --- | --- | --- |
| 0 | fixados | 3 posts de apresentação | Publicados à mão e fixados no perfil (`publicado: "manual"` na fila) |
| 1 (12–18 out) | `crescer` | Alcance e seguidores | Proibido vender. Sem preço, sem € e sem «link na bio». Carrosséis com `"cta": "seguir"`. Sem o template `bloqueada` |
| 2 (19–25 out) | `lancamento` | Primeiras vendas sem perder o alcance | Ver `.claude/skills/lancamento/SKILL.md`. 70% conteúdo de partilha, 30% venda |
| 3+ | `vender` | Crescer e vender sempre | 75% partilha, 25% venda. Repetir o que o ranking mostra que funciona |

A fonte de verdade das datas, do preço e do link é `config/produto.json`. **Se `link_checkout` estiver vazio, não se escreve «link na bio».** A venda passa a ser só «comenta DEIXA», e o relatório avisa o dono.

## Voz da marca
- Um amigo mais velho com piada, que já levou muitas tampas e se ri disso. Fala por «tu». Frases curtas. Autoironia.
- Brinca-se com a situação, **nunca com ela** e nunca com o corpo dela.
- Usar: ter lata, meter conversa, levar uma tampa, foleiro, fixe, miúda, giro/gira, imperial, telemóvel, ginásio, pequeno-almoço, autocarro, casa de banho, de borla, «bora», «na boa».
- Nunca usar (o `validar.py` bloqueia): você, gata, crush, celular, academia, cantada, garota, mina, balada, ônibus, banheiro, café da manhã, «pra», piropo, xaveco.
- Os emojis servem para dar tom (😂 🍻 ☕ 🇵🇹). No máximo 2 por legenda.
- Cenários portugueses: Sintra, Cais do Sodré, Bairro Alto, Ribeira, Foz, Erasmus, Santos Populares, sardinhas, pastel de nata, Super Bock vs. Sagres, comboio da linha de Cascais, Tinder e Bumble.

## Regras inegociáveis
1. **Conteúdo 100% original.** Nada de repostar vídeos ou prints de outros. Desde 30/04/2026, contas agregadoras deixam de ser recomendadas. As «frases das autoridades» (os criadores que modelamos) são sempre reescritas em PT-PT, como diálogos da marca, sem nomes nem caras.
2. **Respeito.** Nada de manipulação, insistência depois de um «não», comentários sexuais ou sobre o corpo, nem «técnicas» de pressão. Um «não» encerra com elegância, e isso também é conteúdo.
3. **Persona de marca.** A página é a Zero Tampas, com tampinha e paleta. Nunca se inventa uma pessoa falsa, nem caras ou testemunhos gerados por IA.
4. **Máximo 5 hashtags** por post (regra do Instagram). Rodar conjuntos e incluir sempre `#zerotampas`.
5. **Volume com travões.** Máximo de 10–12 posts de feed por dia, ≥ 45 min entre posts, publicações entre 07:30 e 23:30, e feed + stories ≤ `MAX_POR_DIA` (15). Nunca subir o volume na semana a seguir a uma `PAUSA`.
6. **Nunca fazer commit de tokens.** O `IG_ACCESS_TOKEN` só existe nos Secrets do GitHub ou numa variável de ambiente.
7. Antes de gerar, corre sempre `python3 ferramentas/validar.py`. Se der erro, não se publica.

## Paleta e templates
Cores (`cor`): `mag` #FF2D87 · `tan` #FF7A2F · `sol` #FFD84A · `plum` #3E0F45 · tinta #2A0B2D · blush #FFEAF2. Não repetir a mesma cor em posts seguidos.

| `template` | Para quê | Campos obrigatórios (opcionais entre parênteses) |
| --- | --- | --- |
| `deixa` | Deixa do dia (1.º post do dia) | `local`, `frase`, (`cor`, `numero`, `rodape`) |
| `lista` | Carrossel para guardar | `capa{eyebrow,titulo}`, `itens[{titulo,nota}]` (≤7), (`dica{titulo,texto}`, `cta`) |
| `vs` | Carrossel foleiro vs. fixe | `capa{eyebrow,titulo}`, `pares[{foleiro,fixe}]` (≤8), (`cta`) |
| `chat` | Conversa antes/depois | `titulo`, `antes[{de:"eu"\|"ela",txt}]`, `depois[...]`, (`antes_rodape`) |
| `notas` | Nota do telemóvel | `titulo`, `linhas[]`, (`rodape`) |
| `meme` | Frase de impacto | `setup`, `punch`, (`cor`) |
| `bloqueada` | 1 deixa visível + 2 desfocadas (venda) | `titulo`, `visivel`, `bloqueadas[2]`, (`rodape`) |
| `dialogo` | Diálogo com lata (frases das autoridades) | `falas[{quem:"ele"\|"ela",txt}]`, (`cor`, `eyebrow`, `rodape`) |
| `tweet` | Cartão de texto @zerotampas | `texto`, (`cor`) |
| `marca` | «Marca alguém que…» | `texto`, (`cor`) |

Todos os posts levam também `legenda` (a hook na 1.ª linha e um CTA no fim) e, opcionalmente, `hashtags` (máximo 5) e `story: true` (cria uma versão 9:16, publicada 10 min depois).

Nos carrosséis, `"cta": "seguir"` mete no último slide «envia e segue». Sem `cta`, o último slide é o de venda: 12,90 €, comenta DEIXA, link na bio.

## Ritmo de um dia (modelo)
- **08:00–08:30:** `deixa` (Deixa do dia #N), com story.
- **12:30–13:00:** carrossel (`lista` ou `vs`), com story.
- **Ao longo do dia:** intercalar `dialogo`, `tweet`, `marca`, `meme`, `notas` e `chat`, nunca dois do mesmo tipo seguidos.
- **Último post (21:00–22:30):** o post mais partilhável do dia, com story.
- **Volume:** semana 1 em rampa 4→10. A partir daí 8–10 por dia, ajustado pelo ranking e pelo estado de saúde da conta.

## Mapa do repositório
```
CLAUDE.md                      esta memória
config/produto.json            preço, link, datas, palavra-chave (fonte de verdade)
conteudo/rascunhos/semana-NN.json   rascunho escrito pelo Claude (posts por dia, sem horas)
conteudo/semana-NN.json        semana agendada (gerada por ferramentas/agendar.py)
conteudo/construir-semana-01.py     exemplo histórico de como a semana 1 foi construída
ferramentas/agendar.py         rascunho → semana-NN.json (horas, ids, hashtags)
ferramentas/validar.py         verifica língua, respeito, fase, repetidos, horários, volume
ferramentas/estado.js          estado da fila / pausa / quanto conteúdo falta (--json)
ferramentas/mock-graph.js      API falsa para testar sem publicar
gerar.js                       semana-NN.json → saida/semana-NN/*.jpg + fila/fila.json
publicar.js                    publica o que está na hora (corre no GitHub a cada 30 min)
insights.js                    métricas → dados/insights.json, dados/ranking.md, dados/seguidores.csv
renovar-token.js               renova o token da Meta (60 dias)
dados/aprendizados.md          regras tiradas dos números (lidas antes de escrever cada semana)
dados/relatorios/              relatório semanal para o dono
perfil/                        foto, destaques, bio
.github/workflows/             publicar.yml · metricas.yml · claude-semana.yml
```

## Comandos (skills do projeto)
- `/gerar-semana [N]`: escreve, valida, gera e agenda a próxima semana (ou a semana N).
- `/analisar`: lê as métricas, faz o ranking e atualiza `dados/aprendizados.md`.
- `/lancamento`: é o guia da fase de venda. O `/gerar-semana` usa-o a partir da semana 2.
- `/status`: mostra se está tudo a publicar, se há pausa ou erros, e o que vem a seguir.
- `/testar`: faz um ensaio completo contra a API falsa, sem publicar nada.

## Comandos úteis
```bash
npm install && npx playwright install chromium          # 1.ª vez
python3 ferramentas/agendar.py conteudo/rascunhos/semana-02.json
python3 ferramentas/validar.py conteudo/semana-02.json
node gerar.js conteudo/semana-02.json                   # CHROME_PATH=... se o Chromium não for o do Playwright
node ferramentas/estado.js
DRY_RUN=1 node publicar.js
```

## Estados na fila (`fila/fila.json` → `publicado`)
- `false`: por publicar.
- `true`: publicado.
- `"falhou"`: 3 erros seguidos.
- `"expirado"`: passou mais de 3 h da hora, por isso não sai em rajada.
- `"cancelado"`: o dono cancelou.
- `"manual"`: publicado à mão.

Para cancelar um post: trocar `false` por `"cancelado"` e fazer commit.
