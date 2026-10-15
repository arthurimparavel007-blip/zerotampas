# Semana 2 · Lançamento (20 a 26/10/2026)

**Fase:** lançamento · **70 Reels** (10 por dia, das 08:00 às 22:30 de Lisboa) · **20 de venda (29%)** e 50 de partilha · stories pausados (a página publica só Reels).

| Dia | Posts | Venda |
| --- | --- | --- |
| Ter 20/10, abertura | 10 | Carrossel «O que vem no guia» (12:30), tweet (17:00), bloqueada «comboio» (20:30) |
| Qua 21/10 | 10 | Notas «Não é para decorar frases» (14:00), bloqueada «ginásio» (18:30), meme «3 imperiais» (22:30) |
| Qui 22/10 | 10 | Deixa #10 com rodapé do guia (08:00), bloqueada «apps» (17:00), tweet (20:30) |
| Sex 23/10, fim de semana | 10 | Notas «O que vem no guia» (17:00), bloqueada «sexta à noite» (18:30), meme «Uber» (22:30) |
| Sáb 24/10, partilha forte | 10 | Deixa #12 com rodapé (08:00), bloqueada «mercado» (20:30) |
| Dom 25/10, resumo | 10 | Notas «Para quem é o guia» (14:00), meme «12,90 €» (17:00), bloqueada «miradouro» (20:30) |
| Seg 26/10 | 10 | Deixa #14 com rodapé (08:00), tweet (17:00), bloqueada «segunda-feira» (20:30) |

A Deixa do dia continua a numeração da semana 1: #8 a #14.

## Destaques (os de maior potencial de partilha)
- **s02-d1-2230 · diálogo:** «Achas que vai chover?» / «Isso é uma deixa?» / «Era. Correu mal. Recomeçamos? Sou o Tiago.»
- **s02-d4-1230 · carrossel:** «4 deixas para sábado à noite», feito para enviar ao grupo antes de sair.
- **s02-d2-1530 · tweet:** «Ela: "tens Instagram?" / Eu, com 14 seguidores e 3 fotos do meu prato: "…tenho."»
- **s02-d7-1830 · meme:** «Eu na segunda: "esta semana falo com ela". / Eu na sexta: "para a semana é que é".»
- **s02-d6-1230 · carrossel:** «5 regras que aprendeste esta semana», o resumo para guardar.

## O que mudou em relação à semana 1
- **Formato:** tudo em Reel, com a trilha original e o aviso «Segue e partilha» durante o vídeo. Os estáticos não chegavam a quem não segue a página.
- **Venda entra a 30%.** Como não há link de checkout, nenhum post diz «link na bio». A venda é feita só por «Comenta DEIXA».
- **Os carrosséis de venda terminam no slide «envia e segue».** O slide automático de venda dizia «link na bio», por isso não foi usado.
- **Volume igual ao fim da semana 1:** 10 por dia.
- **Ainda sem dados de alcance** para ajustar a mistura de formatos, porque os primeiros Reels saíram a 15/10. Correr `/analisar` na quarta, 21/10.

## ⚠️ AÇÃO NECESSÁRIA
1. **ManyChat inativo** (`manychat_ativo: false`). Os 20 posts de venda pedem «Comenta DEIXA». Sem a automação, os comentários ficam sem resposta.
   - O ideal é ativar o ManyChat até terça, 20/10, às 12:30, quando sai o primeiro post de venda.
   - Também se pode adiar a venda. Para isso, cancela os 20 posts de venda listados acima.
2. **Checkout vazio** (`link_checkout`). Cria a página de pagamento (MB WAY, Multibanco, cartão) e preenche-a em `config/produto.json`.
3. **Mudança de hora no domingo, 25/10:** os horários já estão convertidos, não é preciso mexer.

## Como cancelar um post
Em `fila/fila.json`, troca `"publicado": false` por `"publicado": "cancelado"` no post que queres cancelar e faz o commit. Também podes pedir ao Claude.
