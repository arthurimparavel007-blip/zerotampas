---
name: gerar-semana
description: Escreve, valida, gera as imagens e agenda a próxima semana de posts da @zerotampas (ou a semana indicada). Usar quando faltar conteúdo na fila, à sexta-feira, ou quando o dono pedir uma semana nova.
argument-hint: "[número da semana, opcional]"
allowed-tools: Bash(node:*), Bash(python3:*), Bash(git:*), Bash(npx:*), Bash(npm:*), Bash(ls:*), Bash(date:*), Read, Write, Edit, Glob, Grep
---

# Gerar a semana seguinte da @zerotampas

Argumento recebido: `$ARGUMENTS`. Se estiver vazio, usa a semana `proxima_semana` que o estado indicar.

## 0. Contexto (ler sempre antes de escrever)
1. `CLAUDE.md`: regras, voz, templates e fases.
2. `config/produto.json`: datas, preço, link e se o ManyChat está ativo.
3. `node ferramentas/estado.js --json` dá-te:
   - **Se `precisa_semana_nova` for `false` e não houver argumento**, pára aqui. Responde «Fila com conteúdo até X. Nada a fazer.» e termina sem commit.
   - Se `pausa` não for null, a semana nova leva no máximo 6 posts de feed por dia e menos 1 story por dia. Diz isto no relatório.
4. `dados/aprendizados.md` e `dados/ranking.md` (se existir): o que funcionou e o que falhou.
   - Se houver token (`IG_ACCESS_TOKEN` definido), corre primeiro `node insights.js` para ter números frescos.
5. `ls conteudo/` e lê a semana anterior (`conteudo/semana-(N-1).json`), para continuar a numeração da «Deixa do dia» e não repetir frases. O validador também verifica as repetições.

## 1. Decidir a semana
- **Data de início:** a segunda-feira a seguir ao último dia já agendado (ver `inicio` da semana anterior + 7).
- **Fase:**
  - semana 1 → `crescer`;
  - semana 2 → `lancamento`;
  - semana 3 ou seguinte → `vender`.
  - Se a fase for `lancamento` ou `vender`, **lê `.claude/skills/lancamento/SKILL.md` e segue-o.**
- **Volume por dia:**
  - Por defeito, `[8, 9, 10, 10, 10, 10, 9]` posts de feed.
  - Não passes de `volume_maximo_feed_por_dia` (em `config/produto.json`).
  - Se houver pausa, recente ou ativa, usa no máximo 6 por dia.
  - Se o ranking mostrar que o alcance médio caiu mais de 40% em relação à semana anterior, baixa 2 posts por dia. Pode ser sinal de saturação.
- **Mistura:** usa as médias por template e por faixa horária do `ranking.md`.
  - Os 3 templates com melhor nota ganham mais espaço (até 40% dos posts).
  - Os piores perdem espaço, mas nunca desaparecem: é preciso continuar a testá-los.
  - Sem dados, usa a mistura da semana 1.

## 2. Escrever o rascunho
Cria `conteudo/rascunhos/semana-NN.json` (NN com 2 dígitos) com este formato:
```json
{ "semana": N, "fase": "lancamento", "inicio": "AAAA-MM-DD",
  "dias": [ [post, post, ...], ... 7 dias ... ] }
```
Cada dia segue o modelo do `CLAUDE.md`:
- 1.º post do dia: `deixa` com `numero` (continua a sequência) e `story: true`.
- Um carrossel por volta das 12:30–13:00 com `story: true`.
- O último post do dia com `story: true`.
- Os outros posts intercalam tipos e cores. **3 stories por dia, no máximo.**

Qualidade de cada post (este é o trabalho principal, por isso dedica-lhe o tempo):
- **Original e novo.** Nada de frases já usadas, nem reformulações óbvias.
- PT-PT natural, de rua, com cenário português concreto.
- A 1.ª linha da legenda é um gancho e a última é um CTA. Roda entre:
  - envia a quem precisa / marca o amigo;
  - guarda;
  - segue para uma deixa por dia;
  - comenta DEIXA.
- Escreve a pensar em **«isto envia-se a um amigo?»**. Se a resposta for não, reescreve.
- Diálogos: o «ele» tem lata e graça, e a «ela» responde com inteligência. Ela nunca é um prémio nem um alvo.
- Respeito em todos os posts: zero corpo e zero insistência.
- Textos curtos dentro das imagens: deixa ≤ 120 caracteres; tweet ≤ 170; falas ≤ 70 cada.

Podes escrever o rascunho num único ficheiro. Se preferires, escreve um script Python (como `conteudo/construir-semana-01.py`) que o produza.

## 3. Agendar, validar e gerar
```bash
python3 ferramentas/agendar.py conteudo/rascunhos/semana-NN.json
python3 ferramentas/validar.py conteudo/semana-NN.json
```
Se o validador der **ERRO**, corrige o rascunho e repete. Lê os AVISOS e corrige os que forem fáceis.
```bash
node gerar.js conteudo/semana-NN.json
```
Depois abre com Read pelo menos 4 imagens geradas:
- uma `deixa`;
- um slide de carrossel;
- um `dialogo`;
- uma story.

Confirma que o texto cabe, que não está cortado e que se lê bem. Se algum texto estiver apertado, encurta-o no rascunho e repete o passo 3.

**A página publica só Reels** (desde 15/10). As imagens servem de base; a seguir gera os vídeos e converte a fila:
```bash
node ferramentas/reels.js conteudo/semana-NN.json        # saida/semana-NN/reels/<id>.mp4 + .json (≈45 s por Reel)
python3 ferramentas/converter_reels.py                   # posts da fila → REELS; stories → cancelado
python3 ferramentas/seo.py                               # linha «Para quem procura: …» (pesquisa do Instagram)
```
O `publicar.js` trata do resto: publica também na página do Facebook, deixa o 1.º comentário com a pergunta do template e, a partir de 1000 seguidores, usa Trial Reels nas horas `TRIAL_HORAS` (nunca nos posts de venda).

**Crescimento (o que as páginas dark grandes fazem e nós copiamos sem copiar conteúdo):**
- **Séries numeradas:** manter «Deixa do dia #N» e criar no máximo 1 série nova por semana (ex.: «Tampa da semana», «Responde ou ignora?»). Séries trazem gente de volta.
- **Repost dos vencedores:** se `dados/ranking.md` mostrar um Reel com partilhas acima da média e com 21+ dias, volta a pô-lo na semana com uma hook nova (1.ª frase e legenda novas, mesmo template). Máximo 2 por semana.
- **Perguntas que geram comentários:** a legenda acaba com uma pergunta fácil de responder (A ou B, «marca o amigo que…»). Comentários e partilhas pesam mais que gostos.
- Nunca: comprar seguidores, follow/unfollow, DMs em massa ou comentários automáticos noutras contas (o Instagram penaliza).

Extrai 1 fotograma de 2 Reels (`ffmpeg -ss 5 -i <mp4> -frames:v 1 /tmp/f.jpg`) e confirma com Read que o aviso «Segue e partilha» aparece e que nada está cortado.

## 4. Relatório e entrega
Escreve `dados/relatorios/semana-NN.md` em **PT-BR**, para o dono, com:
- a fase, as datas, o total de posts e stories, e os posts por dia;
- 3 a 5 destaques, ou seja os posts com mais potencial de partilha (id + texto);
- o que mudou em relação à semana anterior e porquê, com base nos dados;
- **avisos de ação para o dono**, por exemplo:
  - `link_checkout` vazio;
  - `manychat_ativo: false`;
  - pausa ativa;
  - o token a expirar (se o publicador deu erro 190).
- como cancelar um post: trocar `false` por `"cancelado"` em `fila/fila.json`.

Por fim, faz o commit:
```bash
git add conteudo/ saida/semana-NN/ fila/ dados/
git commit -m "semana NN: <fase>, <X> posts + <Y> stories"
git push
```
- Se estiveres a correr no GitHub Actions (`CI=true`), faz push direto.
- Se estiveres na máquina do dono, mostra o resumo e pergunta antes do `git push`.
