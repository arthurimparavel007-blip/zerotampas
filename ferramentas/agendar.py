#!/usr/bin/env python3
"""Zero Tampas · Agendador genérico de semanas.

Transforma um RASCUNHO (posts já escritos, organizados por dia) no ficheiro
conteudo/semana-NN.json que o gerar.js entende: atribui hora, id e hashtags.

Uso:  python3 ferramentas/agendar.py conteudo/rascunhos/semana-02.json

Formato do rascunho:
{
  "semana": 2,
  "fase": "lancamento",                # crescer | lancamento | vender
  "inicio": "2026-10-19",              # segunda-feira da semana
  "dias": [                            # 7 listas, uma por dia, pela ordem em que devem sair
    [ {post}, {post}, ... ],
    ...
  ]
}
Cada post segue o esquema dos templates (ver CLAUDE.md) e precisa de "legenda".
"hashtags" é opcional: se faltar, o agendador roda os conjuntos de TAGS.
"hora" é opcional: se um post já trouxer hora, é respeitada.
"""
import json, os, sys, datetime

SLOTS = {
    1:  ["08:30"],
    2:  ["08:30", "20:30"],
    3:  ["08:30", "13:00", "21:00"],
    4:  ["08:30", "12:30", "18:00", "21:30"],
    5:  ["08:30", "11:30", "13:30", "18:30", "21:30"],
    6:  ["08:00", "10:30", "13:00", "16:30", "19:30", "22:00"],
    7:  ["08:00", "10:00", "12:30", "15:00", "17:30", "20:00", "22:00"],
    8:  ["08:00", "10:00", "12:00", "14:00", "16:30", "18:30", "20:30", "22:30"],
    9:  ["08:00", "09:45", "11:30", "13:00", "14:45", "16:30", "18:30", "20:30", "22:30"],
    10: ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30", "17:00", "18:30", "20:30", "22:30"],
    11: ["08:00", "09:15", "10:30", "12:00", "13:15", "14:30", "16:00", "17:30", "19:00", "21:00", "22:30"],
    12: ["08:00", "09:15", "10:30", "11:45", "13:00", "14:15", "15:30", "16:45", "18:00", "19:30", "21:00", "22:30"],
}
MAX_FEED_DIA = 12
DIAS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

TAGS = [
    ["#portugal", "#humorportugues", "#zerotampas"],
    ["#lisboa", "#porto", "#solteiros", "#zerotampas"],
    ["#primeiroencontro", "#portugal", "#zerotampas"],
    ["#memes", "#humorportugues", "#portugal", "#zerotampas"],
    ["#tinder", "#solteiros", "#portugal", "#zerotampas"],
    ["#confianca", "#portugal", "#lisboa", "#zerotampas"],
]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    r = json.load(open(src, encoding="utf-8"))
    semana, inicio = int(r["semana"]), datetime.date.fromisoformat(r["inicio"])
    dias = r["dias"]
    if len(dias) != 7:
        sys.exit(f"O rascunho tem {len(dias)} dias; tem de ter 7.")
    posts, tag_i, ultimo = [], semana * 2, None
    for d, lista in enumerate(dias):
        n = len(lista)
        if n == 0:
            continue
        if n > MAX_FEED_DIA:
            sys.exit(f"Dia {d + 1}: {n} posts. O máximo seguro é {MAX_FEED_DIA} posts de feed por dia.")
        data = (inicio + datetime.timedelta(days=d)).isoformat()
        for i, p in enumerate(lista):
            p = dict(p)
            hora = p.get("hora") or SLOTS[n][i]
            if not p.get("hashtags"):
                conj = TAGS[tag_i % len(TAGS)]
                if conj == ultimo:
                    tag_i += 1; conj = TAGS[tag_i % len(TAGS)]
                p["hashtags"] = conj; tag_i += 1
            ultimo = p["hashtags"]
            p.update(id=f"s{semana:02d}-d{d + 1}-{hora.replace(':', '')}", data=data, hora=hora)
            posts.append(p)
    out = dict(semana=semana, fase=r.get("fase", "crescer"), inicio=inicio.isoformat(), posts=posts)
    dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "conteudo", f"semana-{semana:02d}.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    stories = sum(1 for p in posts if p.get("story"))
    print(f"✓ {os.path.relpath(dest)} · {len(posts)} posts de feed + {stories} stories")
    for d in range(7):
        doDia = [p for p in posts if p["id"].startswith(f"s{semana:02d}-d{d + 1}-")]
        print(f"  dia {d + 1} ({DIAS_PT[(inicio + datetime.timedelta(days=d)).weekday()] + (inicio + datetime.timedelta(days=d)).strftime(' %d/%m')}): " +
              ", ".join(f"{p['hora']} {p['template']}{'+st' if p.get('story') else ''}" for p in doDia))


if __name__ == "__main__":
    main()
