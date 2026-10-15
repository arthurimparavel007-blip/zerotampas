# Constrói conteudo/rascunhos/semana-02.json — FASE lançamento (20–26 out 2026).
# 10 posts de feed por dia (= volume do fim da semana 1), ~30% venda, tudo publicado como Reel.
# Sem link_checkout: não há «link na bio»; a venda é só «Comenta DEIXA».
# Uso: python3 conteudo/construir-semana-02.py && python3 ferramentas/agendar.py conteudo/rascunhos/semana-02.json
import json, os

VENDA = "Comenta DEIXA e mando-te 3 de borla + o guia completo 👇"
CTAS = ["Envia a quem precisa disto.", "Segue @zerotampas para uma deixa por dia.", "Guarda para não te esqueceres.",
        "Marca o amigo que vai usar isto.", "Partilha nos teus stories.", "Envia ao amigo que trava no «olá»."]
_c = [0]
def cta():
    _c[0] += 1
    return CTAS[_c[0] % len(CTAS)]

RODAPE_SEGUE = "Segue <b>@zerotampas</b>: uma deixa por dia"
RODAPE_BLOQ = "🔒 Comenta DEIXA · as 101 estão no guia"

def deixa(n, local, frase, leg, venda=False):
    p = dict(template="deixa", numero=n, local=local, frase=frase,
             rodape=(f"Esta é a <b>#{n}</b>. As outras 100 estão no guia" if venda else RODAPE_SEGUE))
    p["legenda"] = f"Deixa do dia #{n}\n\n{leg}\n\n" + (VENDA if venda else "Segue @zerotampas para uma deixa por dia.")
    return p

def dialogo(falas, leg, eyebrow=None):
    p = dict(template="dialogo", falas=[dict(quem=q, txt=t) for q, t in falas], legenda=f"{leg}\n\n{cta()}")
    if eyebrow: p["eyebrow"] = eyebrow
    return p

def tweet(texto, leg="", venda=False):
    corpo = (leg + "\n\n" if leg else "")
    return dict(template="tweet", texto=texto, legenda=corpo + (VENDA if venda else cta()))

def marca(texto, leg="😂"):
    return dict(template="marca", texto=texto, legenda=f"{leg}\n\n{cta()}")

def meme(setup, punch, leg, venda=False):
    return dict(template="meme", setup=setup, punch=punch, legenda=f"{leg}\n\n" + (VENDA if venda else cta()))

def notas(titulo, linhas, rodape, leg, venda=False):
    return dict(template="notas", titulo=titulo, linhas=linhas, rodape=rodape, legenda=f"{leg}\n\n" + (VENDA if venda else cta()))

def chat(titulo, antes, rod, depois, leg):
    return dict(template="chat", titulo=titulo, antes=[dict(de=a, txt=t) for a, t in antes], antes_rodape=rod,
                depois=[dict(de=a, txt=t) for a, t in depois], legenda=f"{leg}\n\n{cta()}")

def bloq(titulo, visivel, b1, b2, leg):
    return dict(template="bloqueada", titulo=titulo, visivel=visivel, bloqueadas=[b1, b2], rodape=RODAPE_BLOQ,
                legenda=f"{leg}\n\n{VENDA}")

def lista(eyebrow, titulo, itens, leg, dica=None):
    p = dict(template="lista", cta="seguir", capa=dict(eyebrow=eyebrow, titulo=titulo),
             itens=[dict(titulo=a, nota=b) for a, b in itens], legenda=leg)
    if dica: p["dica"] = dict(titulo=dica[0], texto=dica[1])
    return p

def vs(eyebrow, titulo, pares, leg):
    return dict(template="vs", cta="seguir", capa=dict(eyebrow=eyebrow, titulo=titulo),
                pares=[dict(foleiro=a, fixe=b) for a, b in pares], legenda=leg)

DIAS = [
  # ---------- TER 20/10 · abertura ----------
  [
    deixa(8, "Na paragem do autocarro", "Diz-me que também estás à espera do 728 há vinte minutos, para eu não me sentir o único azarado.",
          "O azar partilhado é a melhor forma de começar. Ela queixa-se do autocarro, tu queixas-te também, e já estão a falar."),
    tweet("Não precisas de ser o mais giro da sala.\nPrecisas de ser o único que disse olá."),
    dialogo([("ele", "Desculpa, sabes onde fica a Rua Augusta?"), ("ela", "Estás nela."), ("ele", "Então afinal não estava perdido. Só precisava de uma desculpa.")],
            "Quando a desculpa é óbvia, assume-a 😂"),
    lista("Novidade", "O que vem no guia Zero Tampas",
          [("101 deixas, por sítio", "Café, ginásio, faculdade, comboio, bar e apps."),
           ("O que dizer a seguir ao olá", "Para a conversa não morrer ao 3.º «pois»."),
           ("Como pedir o número", "Sem ser estranho e sem pressão."),
           ("Apps sem visto", "Primeiras mensagens e respostas a stories."),
           ("Levar uma tampa com pinta", "Um não é um não. E está tudo bem.")],
          "Durante uma semana demos-te uma deixa por dia. Agora juntámos 101 num guia 📘\n\nNão é para decorar frases. É para nunca mais ficares calado quando ela está ali.\n\n12,90 € (em vez de 57 €).\n\n" + VENDA,
          dica=("Quanto custa", "12,90 € em vez de 57 €. Comenta DEIXA em qualquer post e mando-te 3 de borla para experimentares.")),
    marca("Marca o amigo que diz que vai só beber uma e volta com três contactos novos."),
    meme("Eu a passar por ela pela 4.ª vez no supermercado:", "«Que coincidência», disse o homem que já tinha tudo no cesto. 🛒",
         "Toda a gente já fez isto. Da próxima vez, pergunta-lhe qual é o melhor iogurte."),
    tweet("Juntámos 101 deixas num guia.\nNenhuma tem «doeu quando caíste do céu».", "Zero frases foleiras. Só deixas que nascem do sítio onde estás.", venda=True),
    chat("Responder a um story sem matar a conversa", [("ela", "fui ao concerto ontem 🎶"), ("eu", "fixe")], "E a conversa morreu ali",
         [("eu", "Quem tocou? Diz-me já se valeu a pena, que estou a pensar ir ao próximo"), ("ela", "valeu muito!! 😍 queres ver vídeos?")],
         "«Fixe» fecha a porta. Uma pergunta abre-a."),
    bloq("3 deixas para o comboio", "Este lugar está livre ou estás a guardá-lo para alguém mais interessante do que eu?",
         "Sabes se este pára em Carcavelos? Se me enganar, tens de me ajudar a voltar.",
         "Estás a ler isso há três estações. Tem de ser mesmo bom.",
         "Linha de Cascais, linha de Sintra, metro do Porto: a conversa pode começar em qualquer lado 🚆\n\nA primeira está aqui. As outras duas estão no guia."),
    dialogo([("ele", "Achas que vai chover?"), ("ela", "Isso é uma deixa?"), ("ele", "Era. Correu mal. Recomeçamos? Sou o Tiago.")],
            "Quando a deixa falha, rir de ti próprio salva tudo.", eyebrow="Gafe que correu bem"),
  ],
  # ---------- QUA 21/10 ----------
  [
    deixa(9, "Na livraria", "Estou entre estes dois. Tens cara de quem já leu os dois. Qual levo?",
          "Pedir uma opinião é a forma mais fácil de meter conversa. Toda a gente gosta de recomendar um livro."),
    marca("Marca quem se apaixona no comboio todos os dias e nunca diz nada.", "Um dia destes é a paragem dela 🚆"),
    dialogo([("ele", "Tens cara de quem sabe fazer um bom arroz de pato."), ("ela", "E tu de quem não sabe."), ("ele", "Exato. Por isso é que precisamos de jantar juntos.")],
            "Ela respondeu à altura. Ele aproveitou. É assim que se faz."),
    vs("Pedir o número", "Foleiro vs. fixe: pedir o número",
       [("«Dás-me o teu número?» ao fim de dois minutos", "«Gostei de falar contigo. Continuamos isto num café esta semana?»"),
        ("Pedir a meio de uma frase dela", "Esperar pelo ponto alto da conversa"),
        ("Insistir quando ela hesita", "«Na boa, foi bom conhecer-te» e sorrir"),
        ("Mandar mensagem dois minutos depois", "Mandar no dia seguinte, a lembrar uma coisa da conversa")],
       "O número pede-se quando a conversa está a correr bem, não quando acaba 📱\n\nEnvia ao amigo que pede o número antes de dizer o nome."),
    notas("Não é para decorar frases.", ["É para teres lata quando ela está ali", "Para saberes o que dizer a seguir", "Para saberes quando parar", "E para te rires quando não corre bem"],
          "101 deixas · comenta DEIXA ↓", "Uma deixa decorada soa a deixa decorada. Uma deixa que percebes adapta-se a qualquer sítio.", venda=True),
    tweet("Ela: «tens Instagram?»\nEu, com 14 seguidores e 3 fotos do meu prato: «…tenho.»"),
    meme("Quando ela diz «tenho namorado»:", "Eu: «Na boa, bom resto de dia!» 😌\nO meu ego: 🚑", "Sai com classe. O ego recupera, a reputação também."),
    bloq("3 deixas para o ginásio", "Estás à espera desta máquina ou só a julgar a minha técnica?",
         "Sabes ajustar isto? Juro que não é desculpa. Bem, um bocadinho.",
         "Vens sempre a esta hora ou hoje tive sorte?",
         "No ginásio a regra é simples: só no intervalo entre séries e nunca sobre o corpo 🏋️\n\nA primeira está aqui. As outras duas estão no guia."),
    tweet("O pior que te pode acontecer é ela dizer «não, obrigada».\nO melhor ainda não sabes, porque nunca perguntaste."),
    meme("12,90 € = 3 imperiais no Bairro Alto.", "Uma noite de tampas ou 101 deixas para sempre. 🍻",
         "Fizemos as contas por ti.", venda=True),
  ],
  # ---------- QUI 22/10 ----------
  [
    deixa(10, "No comboio", "Sabes se este pára em Oeiras? Se me enganar, pelo menos fica a história.",
          "Uma pergunta prática e um bocadinho de humor. Ela responde, tu agradeces e perguntas para onde vai.", venda=True),
    tweet("Teoria: metade dos casais que conheces começou com uma pergunta parva numa fila."),
    dialogo([("ele", "Gostas de surpresas?"), ("ela", "Depende."), ("ele", "Então surpresa: não sei o que dizer a seguir. Mas queria falar contigo.")],
            "A honestidade também é uma deixa. E das boas."),
    vs("Primeiro encontro", "Foleiro vs. fixe: o primeiro encontro",
       [("Jantar caro e formal", "Bica e caminhada num miradouro"),
        ("Falar só de ti", "Fazer perguntas e ouvir as respostas"),
        ("Telemóvel em cima da mesa", "Telemóvel no bolso"),
        ("«Então, gostaste?» no fim", "«Repetimos?» se correu bem")],
       "O primeiro encontro não é uma entrevista de emprego ☕\n\nGuarda para o próximo."),
    marca("Marca quem responde a stories só com «haha»."),
    notas("Coisas que dizem mais do que a deixa:", ["Olhar nos olhos", "Sorrir antes de falar", "Falar devagar", "Saber sair na hora certa"], "guarda isto ↓",
          "A frase é 20%. O resto é a forma como a dizes."),
    bloq("3 deixas para as apps", "Duas verdades e uma mentira. Eu começo: odeio pastel de nata, sei dançar, já fui ao Algarve de bicicleta.",
         "A tua 4.ª foto merece uma história. Conta lá.",
         "Escolhe: jantar em Alfama ou francesinha no Porto. Não há resposta errada. Há.",
         "A primeira mensagem decide se sais do visto 📱\n\nA primeira está aqui. As outras duas estão no guia."),
    dialogo([("ele", "Vens cá muitas vezes?"), ("ela", "A sério?"), ("ele", "Juro que soava melhor na minha cabeça.")],
            "Se a deixa sair foleira, assume. Ela vai rir-se contigo, não de ti."),
    tweet("O guia não te faz mais giro.\nFaz-te ter alguma coisa para dizer.\nÀs vezes é só isso que falta.", venda=True),
    meme("O meu cérebro às 4 da manhã:", "Lembras-te de quando disseste «igualmente» ao empregado que te desejou boa viagem? 💀",
         "Nunca mais esquecemos."),
  ],
  # ---------- SEX 23/10 · fim-de-semana à porta ----------
  [
    deixa(11, "No Cais do Sodré", "Esta música é boa ou sou só eu que já estou de fim-de-semana? Preciso de uma segunda opinião.",
          "Sexta-feira. Comentar a música é leve, é sobre o momento e dá-lhe espaço para responder como quiser."),
    notas("Antes de sair hoje à noite:", ["Banho tomado e perfume q.b.", "Telemóvel carregado", "3 assuntos na manga", "Zero expectativas, muita lata"], "bom fim-de-semana ↓",
          "Checklist oficial de sexta-feira."),
    dialogo([("ele", "Estás à espera de alguém?"), ("ela", "Da minha amiga."), ("ele", "Faço-te companhia até ela chegar. Depois desapareço com classe.")],
            "Oferecer e cumprir. É isto que separa a lata da chatice."),
    lista("Guarda até sábado", "4 deixas para sábado à noite",
          [("No bar", "«Ajuda-me a escolher. O barman já está farto de mim.»"),
           ("No Bairro Alto", "«Já nos cruzámos três vezes nesta rua. Ou é destino ou estamos os dois perdidos.»"),
           ("Na fila da casa de banho", "«Esta fila tem mais drama do que uma novela da TVI.»"),
           ("Para sair com classe", "«Foi bom falar contigo. Boa noite!» e segues.")],
          "Fim-de-semana à porta 🍸\n\nGuarda e envia ao grupo antes de saírem."),
    tweet("Sexta-feira à noite:\n3 horas no Bairro Alto.\n0 conversas.\n1 bifana.\nA bifana estava ótima."),
    marca("Marca o amigo que conhece toda a gente do bar menos a pessoa que lhe interessa."),
    notas("O que vem no guia Zero Tampas:", ["Deixas para o bar, o comboio e as apps", "Como passar do olá à conversa", "O momento certo para pedir o número", "Respostas a stories que não ficam no visto", "O que fazer quando levas uma tampa"],
          "12,90 € · comenta DEIXA ↓", "Antes do fim-de-semana, a lista completa 📘\n\n12,90 € em vez de 57 €.", venda=True),
    bloq("3 deixas para sexta à noite", "Ajuda-me a escolher a próxima música. Se for má, a culpa é tua.",
         "Estás com cara de quem conhece o melhor sítio para acabar a noite.",
         "Os teus amigos estão a olhar para mim. Isso é bom ou mau?",
         "Hoje à noite vais precisar disto 🍻\n\nA primeira está aqui. As outras duas estão no guia."),
    dialogo([("ele", "Sabes dançar kizomba?"), ("ela", "Sei."), ("ele", "Ótimo. Eu não. Precisas de um aluno?")],
            "Admitir que não sabes também é lata."),
    meme("Um Uber sozinho para casa às 4 da manhã: 15 €.", "101 deixas para teres alguma coisa para dizer antes disso: 12,90 €. 🚕",
         "Fica a sugestão para esta noite.", venda=True),
  ],
  # ---------- SÁB 24/10 · dia de partilha forte ----------
  [
    deixa(12, "Na Feira da Ladra", "Achas que isto é uma antiguidade ou só uma coisa velha? Tens ar de quem percebe.",
          "Sábado de manhã, feira, objetos estranhos: a conversa começa sozinha. Pede-lhe a opinião.", venda=True),
    meme("Ela respondeu em 2 minutos.", "Eu: à espera de 2 horas para não parecer desesperado. ⏳", "Responde quando te apetecer. Joguinhos cansam."),
    dialogo([("ele", "Essa francesinha é de onde?"), ("ela", "Segredo."), ("ele", "Justo. Troco o segredo por um café na Baixa.")],
            "Resposta a story que acaba em convite. Sem pressa e sem pressão.", eyebrow="Resposta a story"),
    lista("Guarda isto", "4 sítios onde a conversa começa sozinha",
          [("Miradouro ao pôr do sol", "Toda a gente está a olhar para o mesmo. Comenta a vista."),
           ("Feira ou mercado ao sábado", "Pergunta o que ela acha de um objeto estranho."),
           ("Aula de surf ou de dança", "Ninguém se leva a sério ao primeiro dia."),
           ("Ribeira ao fim da tarde", "A esplanada está cheia. Pergunta se o lugar ao lado está livre.")],
          "Escolhe bem o sítio e metade do trabalho está feito 🌅\n\nGuarda para este fim-de-semana."),
    tweet("Mensagem às 3 da manhã nunca foi boa ideia.\nNem em 2010, nem agora."),
    marca("Marca quem ainda está à espera do «momento certo» desde o secundário."),
    dialogo([("ele", "A tua cara não me é estranha."), ("ela", "Clássico."), ("ele", "Pois é. Era a única que sabia. Agora ajuda-me tu.")],
            "Ela apanhou a deixa. Ele não fugiu. Resultado: estão a rir os dois."),
    chat("Depois do primeiro encontro", [("eu", "obrigado pela noite, adorei, és incrível, quando nos vemos outra vez? amanhã? 😍😍")], "Visto. Sem resposta.",
         [("eu", "Ainda me estou a rir da história do teu chefe e do micro-ondas 😂"), ("ela", "ahah nem me lembres 🙈 foi giro, repetimos")],
         "Calma. Lembra-te de uma coisa da conversa e deixa-a respirar."),
    bloq("3 deixas para o mercado", "Isso é para comer já ou vais fingir que é para o jantar?",
         "Qual destes queijos é o melhor? Confio em ti, não no vendedor.",
         "Tens ar de quem sabe escolher fruta. Eu levo sempre as piores.",
         "Sábado no mercado é dos melhores sítios para meter conversa 🧺\n\nA primeira está aqui. As outras duas estão no guia."),
    tweet("Conselho de irmão mais velho:\nse ela está de fones, não é a altura."),
  ],
  # ---------- DOM 25/10 · a semana em resumo ----------
  [
    deixa(13, "Na lavandaria", "Primeira vez numa lavandaria destas. Isto é para roupa branca ou vou estragar tudo?",
          "Pedir ajuda numa coisa simples. Ela explica, tu agradeces e a conversa já está aberta."),
    tweet("Domingo é o dia oficial de pensar «devia ter falado com ela» sobre a sexta."),
    dialogo([("ele", "Desculpa, isto é a fila para o 28?"), ("ela", "É a fila para o gelado."), ("ele", "Melhor ainda. Qual me recomendas?")],
            "Enganaste-te na fila? Aproveita a fila."),
    lista("Resumo da semana", "5 regras que aprendeste esta semana",
          [("Brinca com a situação", "Nunca com ela, nunca com o corpo."),
           ("Pergunta e ouve", "A conversa é um jogo de pingue-pongue."),
           ("Pede o número no ponto alto", "Não quando a conversa está a morrer."),
           ("Um «não» encerra", "«Na boa, bom resto de dia!» e segues."),
           ("Uma tampa é só uma história", "E as histórias contam-se aos amigos.")],
          "Domingo é dia de rever a matéria 📚\n\nGuarda e envia ao amigo que precisa."),
    notas("Para quem é o guia:", ["Para quem trava no «olá»", "Para quem vive no visto", "Para quem tem lata mas fica sem assunto", "Não é para quem quer truques"],
          "comenta DEIXA ↓", "Se te reconheces numa destas, é para ti.", venda=True),
    marca("Marca o amigo que vai usar a deixa de hoje e dizer que foi ele que a inventou."),
    meme("Gastar 12,90 € num guia de deixas", "vs. passar mais 5 anos a dizer «para a próxima falo com ela». 🫠", "Contas simples.", venda=True),
    tweet("Ensaiei a frase o caminho todo.\nCheguei lá e disse «olá… ahm… bom tempo, não?»\nEla riu-se na mesma."),
    bloq("3 deixas para o miradouro", "Esta vista é sempre assim ou fizeste algum acordo com o sol?",
         "Tiras-me uma foto? Em troca digo-te o melhor sítio para jantar aqui perto.",
         "Vens cá muitas vezes ou também subiste a pé e estás a arrepender-te?",
         "Domingo ao fim da tarde, miradouro cheio 🌅\n\nA primeira está aqui. As outras duas estão no guia."),
    chat("A primeira mensagem depois de ela te dar o número", [("eu", "olá"), ("ela", "olá?")], "Quem é este?",
         [("eu", "Fala o rapaz do queijo que derrete bem. O jantar correu bem graças a ti 🧀"), ("ela", "ahah ainda bem! afinal o que fizeste?")],
         "Lembra-a de onde se conheceram. Uma piada interna vale mais do que um «olá»."),
  ],
  # ---------- SEG 26/10 ----------
  [
    deixa(14, "Na pastelaria", "Último pastel de nata. Dividimos ou decidimos isto ao pedra, papel, tesoura?",
          "Uma pequena disputa divertida. Seja qual for o resultado, já estão a conversar.", venda=True),
    marca("Marca o amigo que precisa de GPS para sair da zona de conforto."),
    tweet("Segunda-feira, nova semana.\nDesafio: diz olá a uma pessoa que não conheces até sexta."),
    lista("Desafio da semana", "5 micro-desafios para ganhar lata",
          [("Dá os bons dias a quem não conheces", "No elevador, no café, na paragem."),
           ("Pede uma recomendação", "«O que é que vale a pena aqui?»"),
           ("Elogia um estilo", "«Esses ténis são brutais.» Nunca o corpo."),
           ("Mete conversa numa fila", "Comenta a espera. Toda a gente se queixa."),
           ("Leva uma tampa e conta a um amigo", "Vais ver que não doeu nada.")],
          "A lata treina-se como um músculo 💪\n\nGuarda e faz um por dia."),
    dialogo([("ele", "Desculpa, esse cão morde?"), ("ela", "Só quem faz perguntas parvas."), ("ele", "Então estou tramado. Tenho mais umas cinco.")],
            "Ela provocou, ele aceitou o jogo."),
    notas("Lembretes de segunda-feira:", ["Ninguém está a olhar para ti tanto como pensas", "Uma tampa não estraga a semana", "Dizer olá não custa nada", "Sorrir também conta"], "boa semana ↓",
          "Para começar a semana com lata."),
    tweet("Na semana passada demos-te 7 deixas.\nNo guia estão 101, por sítio.", venda=True),
    meme("Eu na segunda: «esta semana falo com ela».", "Eu na sexta: «para a semana é que é». 📅", "Esta semana quebra-se o ciclo."),
    bloq("3 deixas para segunda-feira", "Também precisas de um café para sobreviver a hoje ou és daquelas pessoas felizes às segundas?",
         "Diz-me que não sou o único a fingir que trabalho desde as nove.",
         "Vou buscar um café. Queres um? É pela causa. Bem, também é por ti.",
         "Segunda-feira também dá para meter conversa ☕\n\nA primeira está aqui. As outras duas estão no guia."),
    dialogo([("ele", "Sabes onde é a saída?"), ("ela", "Ali à direita."), ("ele", "Obrigado. Mas ainda não me apetece ir embora.")],
            "Simples, honesto e com um sorriso."),
  ],
]

CORES = ["mag", "tan", "sol", "plum"]
ci = 0
for dia in DIAS:
    assert len(dia) == 10, len(dia)
    for p in dia:
        if p["template"] in ("deixa", "dialogo", "tweet", "marca", "meme", "lista", "vs"):
            p["cor"] = CORES[ci % 4]; ci += 1

out = dict(semana=2, fase="lancamento", inicio="2026-10-20", dias=DIAS)
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rascunhos", "semana-02.json")
os.makedirs(os.path.dirname(dest), exist_ok=True)
out = json.loads(json.dumps(out, ensure_ascii=False).replace(" €", "\u00a0€"))
json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
vendas = sum(1 for d in DIAS for p in d if "Comenta DEIXA" in p["legenda"])
print(f"✓ {dest} · {sum(len(d) for d in DIAS)} posts · {vendas} de venda")
