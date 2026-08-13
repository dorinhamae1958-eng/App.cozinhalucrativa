// Bônus: Mensagens que Vendem — Scripts para WhatsApp
// Fonte: PDF "Mensagens que Vendem WhatsApp" (Cozinha Lucrativa)
// Placeholders: {cliente}, {especialidade}, {link}

export const WHATSAPP_CATEGORIES = [
  {
    id: "boas-vindas",
    title: "Primeiro contato",
    subtitle: "Quebre o gelo e comece a conversa",
    emoji: "👋",
    color: "emerald",
  },
  {
    id: "reengajamento",
    title: "Reengajamento",
    subtitle: "Recupere quem sumiu e quebre objeções",
    emoji: "🎯",
    color: "amber",
  },
  {
    id: "beneficios",
    title: "Benefícios & ferramentas",
    subtitle: "Mostre o que o seu produto entrega",
    emoji: "✨",
    color: "sky",
  },
  {
    id: "fechamento",
    title: "Fechamento",
    subtitle: "Chamadas para ação e urgência",
    emoji: "🚀",
    color: "rose",
  },
];

export const WHATSAPP_SCRIPTS = [
  {
    id: "s01",
    category: "boas-vindas",
    title: "Boas-vindas para novo contato",
    description:
      "Quando um cliente novo entra em contato pela primeira vez e você quer causar uma boa primeira impressão.",
    message:
      "Olá, {cliente}! Seja muito bem-vindo(a) 🍰 Que bom ter você por aqui! Estou animado(a) para te ajudar a matar essa vontade de {especialidade}. Me conta: você está pensando em pedir para uma ocasião especial ou é para você mesmo(a) provar? Assim eu já monto a melhor sugestão pra você!",
  },
  {
    id: "s02",
    category: "boas-vindas",
    title: "Resposta a interesse em produto específico",
    description:
      "Cliente demonstrou interesse em uma das suas especialidades. Confirme, informe e envolva.",
    message:
      "Que ótimo que você se interessou por {especialidade}, {cliente}! É um dos meus queridinhos aqui 💛 Trabalho com receita própria e ingredientes selecionados, então o resultado é sempre um sabor caseiro difícil de esquecer. Quer que eu te envie os sabores disponíveis e valores? Posso separar pra sua data também. 😉",
  },
  {
    id: "s03",
    category: "reengajamento",
    title: "Cliente que sumiu depois do orçamento",
    description:
      "Reengajar quem pediu informações mas não deu continuidade. Sem cobrança, com cuidado e presença.",
    message:
      "Oi {cliente}, tudo bem? 🌸 Passando aqui pra te lembrar que combinei de reservar aquele {especialidade} pra você. Ainda dá tempo de agendar. Se quiser, eu posso te enviar novamente os detalhes com fotos dos sabores? Fico à disposição! 🥰",
  },
  {
    id: "s04",
    category: "reengajamento",
    title: "Cliente inseguro com o preço",
    description:
      "Cliente achou caro ou está pensando muito. Reforce o valor sem baixar o preço.",
    message:
      "Entendo perfeitamente sua preocupação com o valor, {cliente} 💭 O preço reflete um preparo artesanal com ingredientes de qualidade, encomenda feita sob medida e entrega no dia combinado. Você paga por um produto único, feito com carinho pra sua ocasião. Quer que eu te mostre opções de tamanhos ou combos mais econômicos? Assim, encontramos a melhor pra você. ✨",
  },
  {
    id: "s05",
    category: "beneficios",
    title: "Apresentando sua vitrine online",
    description:
      "Compartilhar seu catálogo digital com o cliente de forma leve e chamativa.",
    message:
      "Já viu minha vitrine online, {cliente}? 🍰 Todas as delícias, sabores e valores em um só lugar, atualizado direto no seu celular. É só clicar, escolher e fazer o pedido comigo aqui pelo WhatsApp: {link}",
  },
  {
    id: "s06",
    category: "beneficios",
    title: "Encomendas organizadas e pontualidade",
    description:
      "Cliente busca confiança e organização. Mostre que você tem processo.",
    message:
      "Aqui na minha cozinha, {cliente}, cada encomenda é acompanhada uma a uma pra chegar exatamente como você imaginou e no dia certinho 🕒 Você recebe confirmação, foto do produto pronto e combinamos entrega tranquila. Bora agendar o seu {especialidade}? 💛",
  },
  {
    id: "s07",
    category: "fechamento",
    title: "Oferta especial com prazo",
    description:
      "Criar leve urgência sem pressão. Deixe claro o benefício e o prazo.",
    message:
      "{cliente}, tô com uma condição especial essa semana pra quem fechar até sexta 🎉 Você garante seu {especialidade} com desconto e prioridade na agenda. Quer que eu reserve o seu? Me avisa até amanhã pra eu segurar a vaga! 🔥",
  },
  {
    id: "s08",
    category: "fechamento",
    title: "Reforço final antes do fechamento",
    description:
      "Cliente perto de decidir. Diminua atrito e ofereça o próximo passo claro.",
    message:
      "Show, {cliente}! Pra fechar seu pedido de {especialidade}, é só me confirmar por aqui e eu te envio a chave Pix + horário de retirada/entrega 💫 Assim que confirmar o pagamento, entro na produção. Bora? Sua encomenda vai ficar linda!",
  },
];
