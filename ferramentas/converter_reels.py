#!/usr/bin/env python3
"""Zero Tampas · troca, na fila, os posts estáticos pendentes pelos Reels já gerados (mesmo horário).
Os stories pendentes ficam «cancelado» (a página passa a publicar só Reels).

Uso: python3 ferramentas/converter_reels.py [fila.json] [--manter-stories]
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
caminho = args[0] if args else os.path.join(ROOT, "fila", "fila.json")
manter_stories = "--manter-stories" in sys.argv

fila = json.load(open(caminho, encoding="utf-8"))
trocados, cancelados, sem_video = 0, 0, []
for it in fila:
    if it.get("publicado") is not False:
        continue
    if it["tipo"] == "STORY":
        if not manter_stories:
            it["publicado"] = "cancelado"; cancelados += 1
        continue
    if it["tipo"] == "REELS":
        continue
    pasta = os.path.dirname(it["imagens"][0])            # saida/semana-NN
    mp4 = f"{pasta}/reels/{it['id']}.mp4"
    meta = os.path.join(ROOT, pasta, "reels", f"{it['id']}.json")
    if not os.path.exists(os.path.join(ROOT, mp4)):
        sem_video.append(it["id"]); continue
    m = json.load(open(meta)) if os.path.exists(meta) else {}
    it["tipo"] = "REELS"
    it["imagens"] = [mp4]
    if m.get("thumb_offset_ms"):
        it["thumb_offset_ms"] = m["thumb_offset_ms"]
    it.pop("erro", None); it.pop("tentativas", None)
    trocados += 1

json.dump(fila, open(caminho, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
csv = ["data_lisboa,hora_lisboa,tipo,imagens,legenda"]
for x in fila:
    d, h = x["quando_lisboa"].split(" ", 1)
    csv.append(",".join([d, h, x["tipo"], " | ".join(x["imagens"]), '"' + x["legenda"].replace('"', '""') + '"']))
open(os.path.join(os.path.dirname(caminho), "fila.csv"), "w", encoding="utf-8").write("\n".join(csv))
print(f"✓ {trocados} posts passaram a Reels · {cancelados} stories cancelados · sem vídeo: {sem_video or 'nenhum'}")
