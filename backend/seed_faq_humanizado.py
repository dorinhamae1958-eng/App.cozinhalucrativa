"""
Seed humanizado da biblioteca pública do Plantão de Dúvidas.

Insere perguntas/respostas escritas com voz de aluna real e mentora acolhedora
— exatamente o tom pedido pelo PRD ("nada de aparência de helpdesk").

Executar: python /app/backend/seed_faq_humanizado.py
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cozinha_lucrativa")


FAQ_HUMANIZADO = [
    # ---------- RECEITAS ----------
    {
        "category": "receitas",
        "subject": "Meu bolo caseiro afunda no meio, o que eu fiz de errado?",
        "question": (
            "Professora, faz uns três testes que meu bolo caseiro sobe lindo no forno "
            "e depois de tirar ele afunda no meio. Sigo a receita certinha, mas parece "
            "que ele desiste no final. Estou fazendo algo errado ou é o meu forno?"
        ),
        "answer": (
            "Respira, isso acontece muito no começo — e quase nunca é a receita.\n\n"
            "Três coisas costumam ser as culpadas: forno aberto cedo demais (não "
            "abre nos primeiros 30 minutos, mesmo que a curiosidade doa); claras "
            "batidas em ponto de neve muito firme, elas colapsam quando esfriam; "
            "e temperatura alta demais, que doura por fora antes do miolo firmar.\n\n"
            "Faz o próximo teste em 170 °C, bate as claras só até ponto de brilho "
            "(nem duro, nem mole) e só espeta o palito depois de 35 minutos fechado. "
            "Me manda foto do resultado que a gente refina juntas."
        ),
        "views": 412,
        "likes": 87,
        "days_ago": 12,
    },
    {
        "category": "receitas",
        "subject": "Posso substituir manteiga por óleo na receita de brigadeiro?",
        "question": (
            "Tô sem manteiga em casa e queria adiantar a produção de brigadeiro "
            "gourmet pra entrega de amanhã. Consigo usar óleo no lugar? Ou é "
            "melhor eu esperar e comprar a manteiga certa?"
        ),
        "answer": (
            "Espera e compra a manteiga, meu amor. No brigadeiro a manteiga não é "
            "gordura só — ela é sabor, brilho e o ponto de enrolar. O óleo deixa "
            "a massa oleosa por fora e sem aquele gosto amanteigado que a cliente "
            "reconhece.\n\n"
            "Se for pra emergência mesmo, prefere margarina culinária (não a de "
            "pote comum) ou creme de leite fresco em dobro. Mas anota aí: pra "
            "encomenda paga, sempre manteiga. É o que faz a sua marca."
        ),
        "views": 356,
        "likes": 74,
        "days_ago": 20,
    },
    # ---------- TÉCNICAS ----------
    {
        "category": "tecnicas",
        "subject": "Como conseguir aquele brilho profissional na cobertura?",
        "question": (
            "Vejo nas fotos da senhora aquele brilho de espelho no bolo, mas o "
            "meu sempre sai fosco ou craquelado. Existe algum truque ou é só "
            "questão de equipamento caro?"
        ),
        "answer": (
            "Nada de equipamento caro — é temperatura e paciência.\n\n"
            "Duas regras salvam qualquer cobertura: (1) o bolo tem que estar "
            "gelado, quase congelado, quando você joga a ganache por cima; e "
            "(2) a ganache tem que estar em 32-34 °C — quente o suficiente pra "
            "escorrer, fria o suficiente pra criar filme. Sem termômetro? Toca "
            "no pulso, tem que sentir morninho, quase morno.\n\n"
            "E não mexe depois. Deixa ela achar o caminho dela. Aí o brilho vem."
        ),
        "views": 289,
        "likes": 63,
        "days_ago": 8,
    },
    {
        "category": "tecnicas",
        "subject": "Meu ponto de bala não pega, sempre fica mole",
        "question": (
            "Tentei fazer bala baiana e trufa dura pra vitrine, mas o ponto "
            "nunca chega no que a receita fala. Eu passo a colher e o creme "
            "escorre. É o meu fogão? Ou eu tô mexendo pouco?"
        ),
        "answer": (
            "Provavelmente é fogo alto demais e mexer no ritmo errado. Ponto de "
            "bala precisa de fogo médio-baixo constante, entre 12 e 18 minutos, "
            "sem pressa.\n\n"
            "O truque que ninguém conta: para de mexer no meio do caminho por "
            "30 segundos. Deixa a mistura respirar. Aí você mexe firme por mais "
            "30, para de novo. Nesse vai-e-vem a água evapora certinho.\n\n"
            "Teste do prato gelado: pinga uma gota num prato saindo do freezer. "
            "Endureceu em 10 segundos? Chegou no ponto."
        ),
        "views": 198,
        "likes": 45,
        "days_ago": 30,
    },
    # ---------- INGREDIENTES ----------
    {
        "category": "ingredientes",
        "subject": "Qual chocolate usar sem gastar uma fortuna?",
        "question": (
            "Eu quero começar a vender brigadeiro gourmet, mas a receita pede "
            "chocolate 60% e o preço no mercado tá impossível. Tem alguma marca "
            "boa e mais barata que a senhora recomenda pra quem tá começando?"
        ),
        "answer": (
            "Sente comigo que vou te dar o mapa.\n\n"
            "Pra começar sem quebrar o caixa: **Callebaut 811** é o queridinho "
            "mas custa. Alternativas honestas: **Sicao Alto Teor**, **Harald "
            "Melken Amargo** e o **Cargill Cobertura Fracionada**. Todas rendem "
            "bem, derretem sem talhar e a cliente não sente diferença no "
            "brigadeiro gourmet.\n\n"
            "Compra em barra de 1kg (não em gotas), sai até 30% mais barato. E "
            "olho no atacadista da sua cidade — Roldão, Assaí e Atacadão têm "
            "preço melhor que mercado comum."
        ),
        "views": 521,
        "likes": 112,
        "days_ago": 5,
    },
    {
        "category": "ingredientes",
        "subject": "Leite condensado zero lactose vale a pena?",
        "question": (
            "Tenho uma cliente que pediu brigadeiro sem lactose. Nunca fiz. O "
            "leite condensado zero lactose fica com o mesmo sabor? Ou eu tô "
            "arriscando entregar algo estranho?"
        ),
        "answer": (
            "Vale muito a pena — e é um nicho que paga bem.\n\n"
            "O leite condensado zero lactose (Piracanjuba e Italac têm) fica "
            "quase idêntico. A diferença é sutil: um toque mais doce e ponto "
            "mais rápido. Tira 2 minutos do tempo de fogo que você conhece.\n\n"
            "Cobra 30% a mais nessa linha — o público sem lactose é fiel e "
            "aceita o preço. Manda a foto do resultado que eu te ajudo a "
            "posicionar no Instagram."
        ),
        "views": 267,
        "likes": 58,
        "days_ago": 15,
    },
    # ---------- EQUIPAMENTOS ----------
    {
        "category": "equipamentos",
        "subject": "Preciso comprar batedeira planetária pra começar?",
        "question": (
            "Vi que quase todo mundo do curso tem uma batedeira planetária. "
            "A minha é uma batedeira comum de mão. Preciso investir agora ou "
            "posso ir levando com a que eu tenho?"
        ),
        "answer": (
            "Vai levando com a que você tem. Sério.\n\n"
            "Batedeira planetária é maravilhosa, mas é investimento de R$ 800 "
            "pra cima que só faz sentido quando você já tá batendo 3-4 "
            "encomendas por semana. Enquanto isso, sua batedeira de mão dá "
            "conta de bolo, chantilly, mousse e claras em neve.\n\n"
            "Investe primeiro em: balança digital (R$ 40), termômetro culinário "
            "(R$ 30) e formas antiaderentes de qualidade. Esses três valem "
            "mais que uma planetária no começo."
        ),
        "views": 674,
        "likes": 148,
        "days_ago": 3,
    },
    {
        "category": "equipamentos",
        "subject": "Forno elétrico ou a gás pra fazer bolo pra vender?",
        "question": (
            "Vou trocar de forno esse mês e fiquei em dúvida se compro um "
            "elétrico ou um a gás. A conta de luz aqui é salgada. O que "
            "faz mais sentido pra quem vende em casa?"
        ),
        "answer": (
            "Depende do que você faz mais.\n\n"
            "**Elétrico**: temperatura precisa, ideal pra confeitaria fina "
            "(macarons, suspiro, bolo alto). Consome sim, mas rende no acabamento.\n\n"
            "**A gás**: melhor pra volume (pão, bolo caseiro, salgado assado). "
            "Aquece mais rápido e a conta cabe no orçamento.\n\n"
            "Se você vende bolo caseiro e salgado, vai de gás sem culpa. Se "
            "quer entrar em confeitaria francesa, um dia você compra o elétrico. "
            "Não precisa ser hoje."
        ),
        "views": 445,
        "likes": 96,
        "days_ago": 18,
    },
    # ---------- PRECIFICAÇÃO ----------
    {
        "category": "precificacao",
        "subject": "Tenho medo de cobrar caro e perder cliente",
        "question": (
            "Professora, eu sei que meu produto é bom, mas na hora de mandar "
            "o preço pra cliente eu travo. Fico com medo dela achar caro e "
            "sumir. Como a senhora fez pra passar essa insegurança no começo?"
        ),
        "answer": (
            "Esse medo tem nome: síndrome da amiga que faz de graça. Passamos "
            "todas por ele.\n\n"
            "Faz um exercício comigo: abre a calculadora do curso, coloca "
            "ingredientes, gás, embalagem e uma hora sua. Aí multiplica sua "
            "hora por R$ 25 (esse é o piso digno pra quem tá começando). O "
            "preço que aparecer é o preço justo. Não menos.\n\n"
            "Cliente que some por causa de preço justo não era sua cliente. "
            "A que fica é a que vai indicar você por anos. Confia."
        ),
        "views": 892,
        "likes": 234,
        "days_ago": 2,
    },
    {
        "category": "precificacao",
        "subject": "Como calcular preço quando o ingrediente aumenta toda semana?",
        "question": (
            "Toda semana eu vou no mercado e o chocolate, a manteiga, tudo "
            "sobe. Como eu faço pra manter meu preço sem prejuízo, mas sem "
            "assustar a cliente com reajuste toda hora?"
        ),
        "answer": (
            "Reajuste mensal, com margem de segurança embutida.\n\n"
            "No primeiro dia de cada mês, refaz a planilha de custo com os "
            "preços atuais. Se subiu até 5%, absorve — a cliente não sente. "
            "Se subiu mais que 5%, ajusta o preço final e comunica assim: "
            "'Reajustei minha tabela conforme o mercado, os valores novos "
            "valem a partir do dia X'.\n\n"
            "E deixa 8% de margem de segurança em cima do custo. Isso é o "
            "colchão que segura você entre um reajuste e outro sem prejuízo."
        ),
        "views": 386,
        "likes": 82,
        "days_ago": 25,
    },
    # ---------- VENDAS ----------
    {
        "category": "vendas",
        "subject": "Como divulgar sem parecer que estou empurrando venda?",
        "question": (
            "Tenho vergonha de postar no meu Instagram porque acho que fica "
            "aquela coisa de 'compra, compra'. Como a senhora divulga sem "
            "ficar cansativo pros amigos e família que me seguem?"
        ),
        "answer": (
            "A regra é 70/20/10.\n\n"
            "70% do conteúdo é você mostrando o processo — bolo saindo do "
            "forno, ingrediente sendo pesado, foto do produto pronto na luz "
            "natural. Ninguém sente que é venda, sente que é uma marca "
            "acontecendo.\n\n"
            "20% é dica prática (como armazenar, como servir, curiosidade "
            "do ingrediente). Isso te posiciona como quem entende.\n\n"
            "Só 10% é 'estou aceitando encomendas'. E olha, quando esse post "
            "chega, a pessoa já tá com fome. Aí ela compra."
        ),
        "views": 758,
        "likes": 189,
        "days_ago": 6,
    },
    {
        "category": "vendas",
        "subject": "WhatsApp ou Instagram, qual funciona mais pra vender?",
        "question": (
            "Estou começando agora e não sei onde focar. O Instagram parece "
            "que precisa de muito post, e o WhatsApp já tenho os contatos. "
            "Qual dos dois traz mais venda de verdade?"
        ),
        "answer": (
            "WhatsApp fecha, Instagram atrai. Você precisa dos dois — mas na "
            "ordem certa.\n\n"
            "No começo: **WhatsApp é o rei**. Manda foto do produto pros teus "
            "contatos, cria um status semanal com o cardápio, cria uma lista "
            "de transmissão (não grupo!) com quem já comprou. É onde a "
            "primeira venda acontece.\n\n"
            "Depois de 1-2 meses vendendo, aí sim Instagram — pra atrair "
            "cliente novo que ainda não te conhece. Nunca o contrário."
        ),
        "views": 623,
        "likes": 145,
        "days_ago": 10,
    },
    # ---------- OUTROS ----------
    {
        "category": "outros",
        "subject": "Preciso de MEI pra começar a vender pra vizinhança?",
        "question": (
            "Vou fazer minhas primeiras vendas informais pros vizinhos e amigos "
            "de amigos. Já preciso abrir MEI logo de cara ou posso esperar "
            "meu faturamento crescer um pouco antes?"
        ),
        "answer": (
            "Espera crescer, sem culpa nenhuma.\n\n"
            "Até uns R$ 2.500 por mês de faturamento você pode ir tranquila "
            "como pessoa física. Anota tudo numa planilha (data, valor, "
            "cliente) e guarda os comprovantes. Isso já é uma organização "
            "profissional.\n\n"
            "Quando bater 3 meses seguidos vendendo mais de R$ 2.500, aí sim "
            "abre MEI (custa R$ 71 por mês, dá pra emitir nota, cliente "
            "empresa passa a comprar). Fazer isso antes é gastar dinheiro "
            "cedo demais."
        ),
        "views": 512,
        "likes": 121,
        "days_ago": 14,
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    col = db.plantao_duvidas

    # Não duplicar: usamos subject como chave lógica do seed
    inserted = 0
    for item in FAQ_HUMANIZADO:
        exists = await col.find_one({"subject": item["subject"]})
        if exists:
            continue
        now = datetime.now(timezone.utc) - timedelta(days=item["days_ago"])
        doc = {
            "id": f"duv_{uuid.uuid4().hex[:14]}",
            "user_id": "seed-faq-humanizado",
            "subject": item["subject"],
            "question": item["question"],
            "answer": item["answer"],
            "status": "respondida",
            "category": item["category"],
            "is_public": True,
            "views": item["views"],
            "likes": item["likes"],
            "read_by_student": True,
            "created_at": now.isoformat(),
            "answered_at": (now + timedelta(hours=6)).isoformat(),
        }
        await col.insert_one(doc)
        inserted += 1

    total_public = await col.count_documents({"is_public": True, "status": "respondida"})
    print(f"Inseridos agora: {inserted}")
    print(f"Total público na biblioteca: {total_public}")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
