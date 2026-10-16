#!/usr/bin/env python3
"""Zero Tampas · palavras-chave de pesquisa nas legendas dos Reels por publicar.

A pesquisa do Instagram (e o Explorar) lê o texto da legenda. Esta ferramenta acrescenta, antes das
hashtags, uma linha curta com termos que os portugueses pesquisam, em rodízio, e nomeia cidades.
É idempotente: legendas que já têm a linha não são mexidas.

Uso: python3 ferramentas/seo.py [fila.json]
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
caminho = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "fila", "fila.json")
MARCA = "Para quem procura: "
LINHAS = [
    "como meter conversa com uma miúda · Lisboa · Porto",
    "frases para meter conversa · deixas que não são foleiras",
    "primeiro encontro · como pedir o número sem ser estranho",
    "primeira mensagem no Tinder e no Bumble · Portugal",
    "como ter lata · confiança para falar com ela · Coimbra · Braga",
    "engate com respeito · dicas de conversa em Portugal",
    "como sair do visto · respostas a stories",
]

fila = json.load(open(caminho, encoding="utf-8"))
n = 0
for i, it in enumerate(fila):
    if it.get("publicado") is not False or it.get("tipo") != "REELS":
        continue
    leg = it.get("legenda", "")
    if MARCA in leg:
        continue
    linha = MARCA + LINHAS[i % len(LINHAS)]
    k = leg.find("\n\n#")
    it["legenda"] = (leg[:k] + "\n\n" + linha + leg[k:]) if k >= 0 else (leg + "\n\n" + linha)
    n += 1
json.dump(fila, open(caminho, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
csv = ["data_lisboa,hora_lisboa,tipo,imagens,legenda"]
for x in fila:
    d, h = x["quando_lisboa"].split(" ", 1)
    csv.append(",".join([d, h, x["tipo"], " | ".join(x["imagens"]), '"' + x["legenda"].replace('"', '""') + '"']))
open(os.path.join(os.path.dirname(caminho), "fila.csv"), "w", encoding="utf-8").write("\n".join(csv))
print(f"✓ palavras-chave acrescentadas a {n} Reels por publicar")
