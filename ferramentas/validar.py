#!/usr/bin/env python3
"""Zero Tampas · Validador de semana. Corre SEMPRE antes do gerar.js.

Uso:  python3 ferramentas/validar.py conteudo/semana-02.json

Verifica os campos de cada template, o limite de 5 hashtags e o tamanho das legendas.
Verifica também o PT-PT (bloqueia palavras do Brasil), o respeito (sem comentários
sexuais ou sobre o corpo), as regras da fase, as frases repetidas de semanas
anteriores, os horários, o volume por dia e o tamanho dos carrosséis.
Sai com código 1 se houver ERROS. Os AVISOS não bloqueiam, mas devem ser lidos.
"""
import json, os, re, sys, glob, datetime, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_POR_DIA = int(os.environ.get("MAX_POR_DIA", 15))  # feed + stories, igual ao publicador

CAMPOS = {
    "deixa": ["local", "frase"],
    "lista": ["capa", "itens"],
    "vs": ["capa", "pares"],
    "chat": ["titulo", "antes", "depois"],
    "notas": ["titulo", "linhas"],
    "meme": ["setup", "punch"],
    "bloqueada": ["titulo", "visivel", "bloqueadas"],
    "dialogo": ["falas"],
    "tweet": ["texto"],
    "marca": ["texto"],
}
CORES = {"mag", "tan", "sol", "plum"}

# Português do Brasil que denuncia que não somos de cá (palavra inteira, sem maiúsculas)
BR = ["você", "vocês", "vc", "gata", "gatinha", "crush", "celular", "academia", "cantada", "cantadas",
      "garota", "garotas", "mina", "minas", "balada", "ônibus", "trem", "banheiro", "café da manhã",
      "geladeira", "tênis", "time", "legal demais", "tô", "pra", "pro", "a gente se vê", "beleza?",
      "moça", "moleque", "cara,", "mano", "show de bola", "top demais", "ficante", "boate",
      "piropo", "piropos", "xaveco", "contatinho"]
# Conteúdo que não fazemos (sexualizar, corpo, manipulação)
DESRESPEITO = ["gostosa", "boazona", "boa como o milho", "rabo", "mamas", "peitos", "corpão", "safada",
               "putas", "vadia", "insistir até", "não aceites um não",
               "ignora o não", "embebeda", "bêbeda", "ciúmes de propósito", "neg ", "negging"]
VENDA = ["12,90", "€", "link na bio", "guia completo", "101 deixas", "mb way", "multibanco", "desconto"]


def tem(texto, w):
    """Procura w como palavra inteira (não apanha «compras» quando procuramos «compra»)."""
    if w == "€": return "€" in texto
    return re.search(r"(?<![\wà-ú])" + re.escape(w) + r"(?![\wà-ú])", texto) is not None


def norm(s):
    s = unicodedata.normalize("NFKD", str(s).lower())
    return re.sub(r"[^a-z0-9 ]", "", "".join(c for c in s if not unicodedata.combining(c))).strip()


def textos(x, chave=""):
    """Todos os textos de um post (recursivo), com o caminho do campo."""
    if isinstance(x, str):
        yield chave, x
    elif isinstance(x, dict):
        for k, v in x.items():
            if k in ("id", "data", "hora", "template", "cor", "cta", "hashtags"):
                continue
            yield from textos(v, f"{chave}.{k}" if chave else k)
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from textos(v, f"{chave}[{i}]")


def frases_chave(p):
    """Frases principais (as que não podem repetir entre semanas)."""
    t = p["template"]
    if t == "deixa": return [p.get("frase", "")]
    if t in ("tweet", "marca"): return [p.get("texto", "")]
    if t == "meme": return [p.get("punch", "")]
    if t == "dialogo": return [" / ".join(f.get("txt", "") for f in p.get("falas", []))]
    if t == "lista": return [p.get("capa", {}).get("titulo", "")] + [i.get("titulo", "") for i in p.get("itens", [])]
    if t == "vs": return [p.get("capa", {}).get("titulo", "")] + [x.get("fixe", "") for x in p.get("pares", [])]
    if t == "bloqueada": return [p.get("visivel", "")]
    return [p.get("titulo", "")]


def n_slides(p):
    t = p["template"]
    if t == "lista": return 1 + len(p.get("itens", [])) + (1 if p.get("dica") else 0) + 1
    if t == "vs": return 1 + len(p.get("pares", [])) + 1
    if t == "chat": return 2
    return 1


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = os.path.abspath(sys.argv[1])
    s = json.load(open(src, encoding="utf-8"))
    erros, avisos = [], []
    E = lambda pid, m: erros.append(f"{pid}: {m}")
    A = lambda pid, m: avisos.append(f"{pid}: {m}")
    fase = norm(s.get("fase", ""))
    cfg_path = os.path.join(ROOT, "config", "produto.json")
    cfg = json.load(open(cfg_path, encoding="utf-8")) if os.path.exists(cfg_path) else {}
    sem_link = not cfg.get("link_checkout")  # sem página de pagamento → não se fala em «link na bio»
    posts = s.get("posts", [])
    if not posts:
        sys.exit("ERRO: semana sem posts")

    # frases já usadas noutras semanas
    usadas = {}
    for f in glob.glob(os.path.join(ROOT, "conteudo", "semana-*.json")):
        if os.path.abspath(f) == src:
            continue
        for p in json.load(open(f, encoding="utf-8")).get("posts", []):
            for fr in frases_chave(p):
                if len(norm(fr)) > 12: usadas[norm(fr)] = p.get("id", os.path.basename(f))

    # ids já publicados (não se podem reescrever)
    fila_path = os.path.join(ROOT, "fila", "fila.json")
    pub_ok = {f["id"] for f in json.load(open(fila_path)) if f.get("publicado") is True} if os.path.exists(fila_path) else set()

    ids, vistos, por_dia, horas = set(), {}, {}, {}
    anterior = None
    for p in posts:
        pid = p.get("id", "?")
        t = p.get("template")
        if pid in ids: E(pid, "id repetido")
        ids.add(pid)
        if pid in pub_ok: E(pid, "este post já foi publicado; muda o id ou a hora")
        if t not in CAMPOS:
            E(pid, f"template desconhecido «{t}»"); continue
        for c in CAMPOS[t]:
            if not p.get(c): E(pid, f"falta o campo «{c}» (template {t})")
        if p.get("cor") and p["cor"] not in CORES: E(pid, f"cor «{p['cor']}» inválida (usa {sorted(CORES)})")
        if t == "dialogo":
            for f in p.get("falas", []):
                if f.get("quem") not in ("ele", "ela"): E(pid, "cada fala precisa de quem: ele|ela")
        if t == "chat":
            for f in p.get("antes", []) + p.get("depois", []):
                if f.get("de") not in ("eu", "ela"): E(pid, "cada mensagem do chat precisa de de: eu|ela")
        if n_slides(p) > 10: E(pid, f"carrossel com {n_slides(p)} slides (máximo 10)")
        # hashtags
        hs = p.get("hashtags", [])
        if len(hs) > 5: E(pid, f"{len(hs)} hashtags (máximo 5)")
        if any(not h.startswith("#") or " " in h for h in hs): E(pid, "hashtag mal escrita")
        if "#zerotampas" not in hs: A(pid, "sem #zerotampas")
        # legenda
        leg = p.get("legenda", "")
        if not leg.strip(): E(pid, "legenda vazia")
        if len(leg) + len(" ".join(hs)) + 2 > 2200: E(pid, "legenda com mais de 2200 caracteres")
        # língua, respeito, fase
        for campo, txt in list(textos(p)):
            low = " " + txt.lower().replace("\n", " ") + " "
            for w in BR:
                if tem(low, w):
                    E(pid, f"palavra do Brasil «{w}» em {campo} → usa PT-PT")
            for w in DESRESPEITO:
                if tem(low, w.strip()): E(pid, f"conteúdo fora das regras «{w.strip()}» em {campo}")
            if "crescer" in fase:
                for w in VENDA:
                    if tem(low, w): E(pid, f"fase crescer não vende: «{w}» em {campo}")
        if "crescer" not in fase and sem_link:
            for campo, txt in textos(p):
                if tem(txt.lower(), "link na bio"): E(pid, f"config/produto.json sem link_checkout: tira «link na bio» de {campo}")
            if t in ("lista", "vs") and p.get("cta") != "seguir":
                E(pid, "sem link_checkout, o slide de venda (diz «Link na bio») não pode sair: usa \"cta\": \"seguir\" ou o template bloqueada")
        if "crescer" in fase and t in ("lista", "vs") and p.get("cta") != "seguir":
            E(pid, "na fase crescer os carrosséis levam \"cta\": \"seguir\"")
        if "crescer" in fase and t == "bloqueada":
            E(pid, "o template bloqueada é de venda; não usar na fase crescer")
        # repetidos
        for fr in frases_chave(p):
            k = norm(fr)
            if len(k) <= 12: continue
            if k in usadas: E(pid, f"frase já usada em {usadas[k]}: «{fr[:60]}»")
            if k in vistos: A(pid, f"frase repetida nesta semana (também em {vistos[k]})")
            vistos[k] = pid
        # horários
        try:
            dt = datetime.datetime.fromisoformat(f"{p['data']}T{p['hora']}")
        except Exception:
            E(pid, "data/hora inválidas"); continue
        if not ("07:30" <= p["hora"] <= "23:30"): A(pid, f"hora {p['hora']} fora da janela 07:30–23:30")
        por_dia.setdefault(p["data"], [0, 0])
        por_dia[p["data"]][0] += 1
        por_dia[p["data"]][1] += 1 if p.get("story") else 0
        horas.setdefault(p["data"], []).append(dt)
        if anterior and anterior["template"] == t and anterior.get("data") == p.get("data"):
            A(pid, f"dois «{t}» seguidos")
        if anterior and anterior.get("cor") and anterior.get("cor") == p.get("cor") and anterior.get("data") == p.get("data"):
            A(pid, f"duas cores «{p['cor']}» seguidas")
        anterior = p

    for d, (feed, st) in sorted(por_dia.items()):
        if feed + st > MAX_POR_DIA:
            E(d, f"{feed} feed + {st} stories = {feed + st} publicações (> MAX_POR_DIA {MAX_POR_DIA}); o publicador ia atrasar posts")
        hs = sorted(horas[d])
        for a, b in zip(hs, hs[1:]):
            if (b - a).total_seconds() < 45 * 60: E(d, f"posts com menos de 45 min de intervalo ({a:%H:%M} e {b:%H:%M})")
    deixas = [p for p in posts if p.get("template") == "deixa" and p.get("numero")]
    nums = [p["numero"] for p in deixas]
    if len(nums) != len(set(nums)): E("deixas", "números de «Deixa do dia» repetidos")

    print(f"Semana {s.get('semana')} · fase {s.get('fase')} · {len(posts)} posts · "
          f"{sum(1 for p in posts if p.get('story'))} stories · {len(por_dia)} dias")
    for d, (feed, st) in sorted(por_dia.items()):
        print(f"  {d}: {feed} feed + {st} stories")
    for a in avisos: print("  AVISO ", a)
    for e in erros: print("  ERRO  ", e)
    if erros:
        print(f"\n✗ {len(erros)} erro(s). Corrige e volta a validar."); sys.exit(1)
    print(f"\n✓ Válida ({len(avisos)} aviso(s)).")


if __name__ == "__main__":
    main()
