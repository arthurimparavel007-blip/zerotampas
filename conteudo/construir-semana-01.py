# Constrói conteudo/semana-01.json — FASE 1 (crescer, sem vender), em empilhamento.
# Rampa de volume: 4, 4, 6, 8, 10, 10, 10 posts de feed por dia + 3 stories por dia.
# Uso: python3 conteudo/construir-semana-01.py
import json, itertools, os, datetime

INICIO = datetime.date(2026, 10, 12)
SLOTS = {
    4:  ["08:30", "12:30", "18:00", "21:30"],
    6:  ["08:00", "10:30", "13:00", "16:30", "19:30", "22:00"],
    8:  ["08:00", "10:00", "12:00", "14:00", "16:30", "18:30", "20:30", "22:30"],
    10: ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30", "17:00", "18:30", "20:30", "22:30"],
}
RAMPA = [4, 4, 6, 8, 10, 10, 10]

# Conjuntos de hashtags a rodar (máx. 5; nunca o mesmo conjunto duas vezes seguidas)
TAGS = [
    ["#portugal", "#humorportugues", "#zerotampas"],
    ["#lisboa", "#porto", "#solteiros", "#zerotampas"],
    ["#primeiroencontro", "#portugal", "#zerotampas"],
    ["#memes", "#humorportugues", "#portugal", "#zerotampas"],
    ["#tinder", "#solteiros", "#portugal", "#zerotampas"],
    ["#confianca", "#portugal", "#lisboa", "#zerotampas"],
]

# ---------- CONTEÚDO ----------
DEIXAS = [  # 1 por dia, sempre o primeiro post da manhã
    dict(local="No café", frase="Pediste o mesmo que eu. Ou temos ótimo gosto ou somos os dois previsíveis.", cor="mag",
         leg="Deixa do dia #1 ☕\n\nBrinca com a situação, nunca com ela. Guarda para usares esta semana."),
    dict(local="No ginásio", frase="Estou a tentar perceber se tu usas mal essa máquina ou se sou eu que a uso mal há dois anos.", cor="tan",
         leg="Deixa do dia #2 🏋️\n\nSó no intervalo entre séries e nunca comentários sobre o corpo. Rir de ti próprio abre sempre a porta."),
    dict(local="No supermercado", frase="Desculpa, sabes se este queijo derrete bem? Vou fazer um jantar e não quero envergonhar-me.", cor="sol",
         leg="Deixa do dia #3 🧀\n\nPedir ajuda é a forma mais fácil de começar uma conversa. As pessoas gostam de ajudar."),
    dict(local="Na faculdade", frase="Percebeste alguma coisa da última meia hora? Diz que não, para eu não me sentir sozinho.", cor="plum",
         leg="Deixa do dia #4 🎓\n\nO sofrimento partilhado une mais do que qualquer deixa decorada."),
    dict(local="No bar", frase="Estou indeciso: imperial ou sangria? Tu é que decides.", cor="tan",
         leg="Deixa do dia #5 🍻\n\nPedir-lhe que escolha entre duas coisas é a forma mais leve de começar. Sexta-feira está aí."),
    dict(local="Na rua", frase="Esse cão é demasiado fixe. Como se chama?", cor="mag",
         leg="Deixa do dia #6 🐶\n\nOs animais abrem qualquer conversa. Ela diz o nome do cão, tu dizes o teu."),
    dict(local="Nas apps", frase="Pizza com ou sem ananás? Disso depende o futuro desta conversa.", cor="sol",
         leg="Deixa do dia #7 🍕\n\nProvoca sobre gostos, nunca sobre o corpo. Ela vai querer defender a pizza dela."),
]

CARROSSEIS = [  # 1 por dia, à hora de almoço
    dict(template="lista", cor="sol", cta="seguir", capa=dict(eyebrow="Guarda isto", titulo="3 deixas para o café que não são foleiras"),
         itens=[dict(titulo="Pediste o mesmo que eu. Ou temos ótimo gosto ou somos os dois previsíveis.", nota="Brinca com a situação, não com ela."),
                dict(titulo="Estás a ler isso há meia hora sem levantar os olhos. Tem de ser bom. O que é?", nota="Toda a gente gosta de falar do livro que está a ler."),
                dict(titulo="Sabes a password do wi-fi? E já agora, sou o Rui.", nota="Apresenta-te cedo. Ela diz-te o nome dela.")],
         dica=dict(titulo="A fórmula", texto="Repara em algo à vossa volta + faz uma pergunta leve. É isto. Não precisas de decorar nada."),
         leg="3 deixas para o café que funcionam porque nascem do sítio onde estás ☕\n\nGuarda e envia ao amigo que vai precisar disto no sábado."),
    dict(template="vs", cor="plum", cta="seguir", capa=dict(eyebrow="Nas apps", titulo="Foleiro vs. fixe: a primeira mensagem"),
         pares=[dict(foleiro="Olá tudo bem?", fixe="Vi o teu cão na terceira foto. Já gosto mais dele do que de metade das pessoas que conheço."),
                dict(foleiro="És linda 😍", fixe="Essa foto é em Sintra? Subiste a pé ou fizeste batota de tuk-tuk?"),
                dict(foleiro="Um textão a contar a tua vida", fixe="Uma pergunta sobre algo do perfil dela. Só uma.")],
         leg="A primeira mensagem decide tudo 📱\n\nMarca o amigo que ainda manda «olá tudo bem?» 😂"),
    dict(template="lista", cor="tan", cta="seguir", capa=dict(eyebrow="Acabou-se o silêncio", titulo="Como a conversa não morre ao 3.º «pois»"),
         itens=[dict(titulo="Puxa o fio", nota="Ela diz que vem da aula de cerâmica? Pergunta pela cerâmica, não mudes de assunto."),
                dict(titulo="Partilha também", nota="Só perguntas parece um interrogatório. Responde com uma história tua, curta."),
                dict(titulo="Joga ao «deixa-me adivinhar»", nota="«Tens sotaque do Norte. Braga?» Ela vai querer corrigir-te."),
                dict(titulo="O silêncio não mata", nota="Três segundos parecem uma eternidade para ti. Para ela é só uma pausa. Sorri.")],
         leg="A primeira frase correu bem. E agora? 🤔\n\nGuarda estas 4 regras e envia a quem fica sempre sem assunto."),
    dict(template="lista", cor="mag", cta="seguir", capa=dict(eyebrow="Lê os sinais", titulo="5 sinais de que ela está a gostar da conversa"),
         itens=[dict(titulo="Responde com frases completas", nota="Não só «sim» e «pois»."),
                dict(titulo="Faz-te perguntas de volta", nota="Interesse é recíproco."),
                dict(titulo="Vira o corpo para ti", nota="Em vez de ficar de lado a olhar para a saída."),
                dict(titulo="Ri-se, mesmo da piada fraca", nota="Sim, nós reparámos."),
                dict(titulo="Prolonga quando tu paras", nota="É a deixa para pedires o número.")],
         leg="Antes de pedires o número, lê isto 👀\n\nE se vires o contrário, sai com elegância: «Bom resto de dia!»"),
    dict(template="vs", cor="mag", cta="seguir", capa=dict(eyebrow="Ao vivo", titulo="Foleiro vs. fixe: quando a vês pela primeira vez"),
         pares=[dict(foleiro="«Doeu quando caíste do céu?»", fixe="«Esse livro vale a pena ou estás a fingir que lês?»"),
                dict(foleiro="Comentar o corpo dela", fixe="Comentar algo do momento"),
                dict(foleiro="Insistir depois de um não", fixe="«Tranquilo. Bom resto de noite!» e seguir")],
         leg="Antes de saíres hoje à noite, revê isto 🍸\n\nRaramente é a cara. É a abordagem."),
    dict(template="lista", cor="plum", cta="seguir", capa=dict(eyebrow="Respeito é atraente", titulo="Como levar uma tampa com pinta"),
         itens=[dict(titulo="Toda a gente leva tampas", nota="Até os mais giros. Faz parte do jogo."),
                dict(titulo="Não é sobre ti", nota="Pode ter namorado, estar num mau dia ou não haver química."),
                dict(titulo="Uma frase basta", nota="«Tranquilo. Bom resto de dia!» Sorris e segues."),
                dict(titulo="Nunca insistir", nota="Nem insultar, nem mandar mensagem a perguntar porquê. Um não é um não."),
                dict(titulo="Joga às 10 tampas", nota="Meta do mês: levar 10. Vais ver que levas menos do que pensas.")],
         leg="A tampa bem levada esquece-se. A mal levada vira vergonha 🧢\n\nEnvia a quem precisa de ouvir isto."),
    dict(template="lista", cor="sol", cta="seguir", capa=dict(eyebrow="Fim do visto", titulo="3 respostas a stories que não ficam no visto"),
         itens=[dict(titulo="«Isso é em Lisboa? Preciso de saber se é tão bom como parece 👀»", nota="Pergunta sobre o sítio."),
                dict(titulo="«Quem escolheu essa música? Merece um prémio.»", nota="Elogia uma escolha, não a cara."),
                dict(titulo="«O teu gato tem mais atitude do que eu. Como se chama?»", nota="Os animais abrem qualquer conversa.")],
         dica=dict(titulo="A regra", texto="Reação a algo concreto + uma pergunta fácil de responder. Nada de 🔥🔥🔥 nem «linda»."),
         leg="Para de reagir com 🔥 aos stories dela 🙃\n\nGuarda e envia ao amigo que vive no visto."),
]

# Frases modeladas das autoridades (Pedrinhuol, Sergio), adaptadas a PT-PT
DIALOGOS = [
    dict(cor="mag", falas=[("ele", "Tocas guitarra?"), ("ela", "Tocava."), ("ele", "Então foste tu que mexeste nas cordas do meu coração.")],
         leg="Ela não estava à espera desta 🎸😂"),
    dict(cor="plum", falas=[("ele", "Sabes que horas são?"), ("ela", "Cinco e quatro."), ("ele", "É que o meu relógio está avariado… diz que é hora de te dar um beijo.")],
         leg="Relógio avariado, lata intacta ⌚😂"),
    dict(cor="tan", falas=[("ele", "Quanto custa o bilhete?"), ("ela", "Que bilhete??"), ("ele", "Para este espetáculo de beleza que estás a dar.")],
         leg="Foleiro? Talvez. Mas ela riu-se 🎟️"),
    dict(cor="sol", falas=[("ele", "É a tua mãe?"), ("ela", "É!"), ("ele", "Acredita que a minha mãe bateu com a cabeça e esqueceu-se de que nós namoramos?")],
         leg="A mãe dela foi a primeira a rir-se 😂"),
    dict(cor="mag", falas=[("ele", "A minha mãe quer dar-te um presente de Natal…"), ("ela", "A mim?"), ("ele", "É que ela quer muito conhecer a nora.")],
         leg="Outubro e já a pensar no Natal 🎄😏"),
    dict(cor="plum", eyebrow="Gafe que correu bem", falas=[("ele", "Estava à espera que ela se fosse embora para vir falar contigo."), ("ela", "Ela quem??"), ("ele", "…pois. Também não sei.")],
         leg="Até a gafe acaba em riso quando tens lata 😅"),
    dict(cor="tan", eyebrow="Até a avó riu", falas=[("ele", "Sabe qual é a atração desta noite?"), ("ela", "Não."), ("ele", "A atração… é a senhora!")],
         leg="Respeito e piada não têm idade 👵❤️"),
    dict(cor="sol", falas=[("ele", "Pode atender-me?"), ("ela", "Posso."), ("ele", "Então dá-me o teu número, para eu te ligar.")],
         leg="Direto ao assunto, com um sorriso 📞"),
    dict(cor="mag", eyebrow="Resposta a story", falas=[("ele", "🍿"), ("ela", "??"), ("ele", "É o que costumo comprar para ver espetáculos como os teus stories.")],
         leg="O emoji que acabou em conversa 🍿"),
    dict(cor="plum", falas=[("ele", "Participaste em algum concurso hoje?"), ("ela", "Não… porquê?"), ("ele", "É que tinhas ganho de certeza.")],
         leg="Clássico com pinta 🏆"),
]

TWEETS = [
    "Ninguém:\nEu, três horas depois, no duche: «devia ter dito que também gosto de pastel de nata».",
    "O meu plano para hoje: falar com ela.\nO meu plano real: olhar para o telemóvel até ela sair do metro.",
    "«Olá tudo bem?» não é uma mensagem. É uma oração.",
    "Levei uma tampa hoje.\nResultado: continuo vivo, o café estava bom e ganhei uma história.",
    "A diferença entre ter lata e ser chato é perceber quando parar.",
    "Ela: «haha»\nEu: 40 minutos a analisar se foi um haha bom ou mau.",
    "Mandei mensagem às 23:47.\nVisto às 23:47.\nResposta prevista: no próximo ano bissexto.",
    "Toda a gente tem aquele amigo que não é assim tão giro e nunca vai para casa sozinho. O segredo dele não é a cara. É dizer olá.",
    "Ninguém nasce a saber meter conversa. Há quem tenha começado a treinar mais cedo.",
    "Primeiro encontro ideal em Portugal: bica, miradouro, pôr do sol. Uma hora. Acaba enquanto está a correr bem.",
    "Ela riu-se da minha piada fraca.\nEu: já escolhi o nome dos nossos cães.",
    "Um «não» é um «não».\nUm «talvez» é um «não» com educação.\nUm «sábado às 18h?» é um sim.",
]
TWEET_LEG = ["Diz que não sou o único 😩", "Verdade ou mentira? 👀", "Envia ao amigo que precisa de ler isto 😂", "Quem nunca 🙃",
             "Guarda isto para sábado.", "Isto devia ser ensinado na escola.", "Partilha nos stories se te identificas 😅", "Marca o teu amigo com lata 😂",
             "Treina-se. Como no ginásio.", "Anota 📝", "Não me julguem 🐶", "Simples assim."]

MARCAS = [
    "Marca o amigo que manda «olá tudo bem?» e acha que é estratégia.",
    "Marca o amigo que tem a frase perfeita… só depois de ela ir embora.",
    "Marca quem precisa de ler isto antes de sair hoje à noite.",
    "Marca o amigo que tem mais lata do que juízo.",
    "Marca o amigo que ensaiou o «olá» 14 vezes ao espelho.",
    "Marca quem ainda reage a stories com 🔥🔥🔥.",
    "Marca o amigo que diz «para a próxima falo com ela» desde 2019.",
]

MEMES = [
    dict(cor="mag", setup="Ela olhou para mim no metro.", punch="Eu: a estudar o mapa das estações como se não soubesse onde moro. 🚇"),
    dict(cor="sol", setup="Quando ela responde ao teu story com um emoji:", punch="É amor? É amizade? Preciso de um especialista. 🧐"),
    dict(cor="tan", setup="Eu a explicar ao meu amigo como se mete conversa:", punch="Eu, quando ela aparece: 🧍‍♂️"),
    dict(cor="plum", setup="Os 3 segundos de silêncio depois do «olá»:", punch="duram mais do que o meu último relacionamento. ⏳"),
]

NOTAS = [
    dict(titulo="Coisas que ninguém me ensinou na escola:", linhas=["Como dizer olá sem tremer", "O que dizer a seguir ao olá", "Como pedir o número sem ser estranho", "Como levar uma tampa e rir-me disso"], rodape="segue para aprenderes 1 por dia ↓",
         leg="Isto devia ser disciplina obrigatória 📓"),
    dict(titulo="Frases proibidas no primeiro encontro:", linhas=["«A minha ex…»", "«Quanto é que ganhas?»", "«Isto é um encontro ou…?»", "«Costumo vir cá com outras»"], rodape="guarda antes de sábado ↓",
         leg="Se já disseste alguma, não estás sozinho 😅"),
    dict(titulo="Plano para esta semana:", linhas=["Dizer bom dia a 5 desconhecidos", "Fazer 3 perguntas a quem não conheço", "Meter conversa com quem me interessa", "Levar uma tampa e rir-me disso"], rodape="7 dias sem vergonha. Alinhas?",
         leg="Nova semana, nova lata 💪 Começa pequeno."),
]

CHATS = [
    dict(titulo="Mesma miúda. Mensagem diferente.", antes=[dict(de="eu", txt="olá tudo bem?")], antes_rodape="Visto às 23:47",
         depois=[dict(de="eu", txt="Isso é em Belém? Preciso de saber se o pastel de nata é tão bom como dizem 👀"), dict(de="ela", txt="ahahah é o melhor 😂 se quiseres mostro-te")],
         leg="A diferença não é a cara. É a mensagem 👀\n\nEnvia ao amigo que vive no visto."),
    dict(titulo="Pedir o encontro: vago vs. concreto", antes=[dict(de="eu", txt="queres sair um dia?"), dict(de="ela", txt="talvez 😅")], antes_rodape="E nunca mais se falou nisso",
         depois=[dict(de="eu", txt="Conheço um miradouro com o melhor pôr do sol de Lisboa. Quinta às 18h30?"), dict(de="ela", txt="combinado 😊")],
         leg="«Um dia» é o dia que nunca chega 📅"),
]

CTAS = ["Segue @zerotampas para uma deixa por dia.", "Envia a quem precisa disto 👇", "Guarda para não te esqueceres.",
        "Comenta DEIXA e mando-te mais, de borla 👇", "Partilha nos teus stories 🔁", "Marca o amigo que vai usar isto 😂"]

# ---------- MONTAGEM ----------
def post(template, leg, **kw):
    return dict(template=template, legenda_base=leg, **kw)

extras = []  # posts "de meio do dia" (diálogo, tweet, marca, meme, notas, chat), intercalados por tipo
pools = {
    "dialogo": [post("dialogo", d["leg"], cor=d["cor"], eyebrow=d.get("eyebrow"), falas=[dict(quem=q, txt=t) for q, t in d["falas"]]) for d in DIALOGOS],
    "tweet":   [post("tweet", TWEET_LEG[i], cor=["plum", "mag", "tan", "sol"][i % 4], texto=t) for i, t in enumerate(TWEETS)],
    "marca":   [post("marca", "", cor=["tan", "mag", "plum", "sol"][i % 4], texto=t) for i, t in enumerate(MARCAS)],
    "meme":    [post("meme", "Envia ao amigo que sofre disto 😂", cor=m["cor"], setup=m["setup"], punch=m["punch"]) for m in MEMES],
    "notas":   [post("notas", n["leg"], titulo=n["titulo"], linhas=n["linhas"], rodape=n["rodape"]) for n in NOTAS],
    "chat":    [post("chat", c["leg"], titulo=c["titulo"], antes=c["antes"], antes_rodape=c["antes_rodape"], depois=c["depois"]) for c in CHATS],
}
ordem = ["dialogo", "tweet", "marca", "meme", "tweet", "dialogo", "notas", "marca", "tweet", "chat", "dialogo", "tweet"]
while any(pools.values()):
    for k in ordem:
        if pools[k]:
            extras.append(pools[k].pop(0))

posts, tag_i, cta_i, ex_i = [], 0, 0, 0
for dia, n in enumerate(RAMPA):
    data = (INICIO + datetime.timedelta(days=dia)).isoformat()
    slots = SLOTS[n]
    almoco = min(range(n), key=lambda i: abs(int(slots[i][:2]) * 60 + int(slots[i][3:]) - 13 * 60))
    for i, hora in enumerate(slots):
        if i == 0:
            d = DEIXAS[dia]
            p = post("deixa", d["leg"], cor=d["cor"], numero=dia + 1, local=d["local"], frase=d["frase"], rodape="Segue <b>@zerotampas</b>: uma deixa por dia")
            p["story"] = True
        elif i == almoco:
            c = dict(CARROSSEIS[dia]); leg = c.pop("leg")
            p = post(c.pop("template"), leg, **c); p["story"] = True
        else:
            p = dict(extras[ex_i]); ex_i += 1
            if i == n - 1: p["story"] = True
        cta = CTAS[cta_i % len(CTAS)]; cta_i += 1
        base = p.pop("legenda_base")
        p["legenda"] = (base + "\n\n" + cta) if base else cta
        p["hashtags"] = TAGS[tag_i % len(TAGS)]; tag_i += 1
        p.update(id=f"s01-d{dia + 1}-{hora.replace(':', '')}", data=data, hora=hora)
        if p.get("eyebrow") is None: p.pop("eyebrow", None)
        posts.append(p)

assert ex_i <= len(extras), f"faltam extras: precisa {ex_i}, tem {len(extras)}"
out = dict(semana=1, fase="crescer (sem vender)", inicio=INICIO.isoformat(), posts=posts)
path = os.path.join(os.path.dirname(__file__), "semana-01.json")
json.dump(out, open(path, "w"), ensure_ascii=False, indent=1)
from collections import Counter
print(len(posts), "posts ·", sum(1 for p in posts if p.get("story")), "stories · extras usados", ex_i, "de", len(extras))
print(Counter(p["template"] for p in posts))
for d in range(7):
    print(d + 1, [p["template"][:5] for p in posts if p["id"].startswith(f"s01-d{d+1}-")])
