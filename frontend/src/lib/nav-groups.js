/**
 * NAV_GROUPS — fonte única de verdade para a árvore de navegação principal.
 *
 * Usado no Header (dropdowns/menu) e nas caixas de valor da Landing.
 * Mantém título/subtítulo/tagline/itens em um único lugar para nunca
 * dessincronizarem.
 *
 * ⚠️ Nenhum ícone react aqui — apenas dados serializáveis. Ícones ficam
 * mapeados por `iconKey` no consumidor (Header/Landing) para não acoplar
 * este arquivo à árvore de dependências do lucide.
 */

export const NAV_GROUPS = [
  {
    id: "aprender",
    label: "Aprender",
    iconKey: "book",
    testId: "nav-group-aprender",
    subtitle: "Aprender a fazer",
    tagline: "Tudo o que você vai dominar por dentro do app.",
    items: [
      {
        to: "/meus-cursos",
        label: "Meus Cursos",
        emoji: "📖",
        testId: "nav-meus-cursos",
        description:
          "Mais de 120 aulas em 10 especialidades e 2 bônus, com receitas testadas e método passo a passo.",
      },
      {
        to: "/minhas-anotacoes",
        label: "Meu Caderno",
        emoji: "📝",
        testId: "nav-meu-caderno",
        description:
          "Anotações rápidas com categorização por IA: receitas, clientes, fornecedores, ideias e lembretes.",
      },
      {
        to: "/plantao",
        label: "Plantão de Dúvidas",
        emoji: "👩‍🍳",
        testId: "nav-plantao",
        description:
          "Envie suas dúvidas para a professora e navegue por respostas de outras confeiteiras na biblioteca.",
      },
    ],
  },
  {
    id: "vender",
    label: "Vender",
    iconKey: "dollar",
    testId: "nav-group-vender",
    subtitle: "Transformar em dinheiro",
    tagline: "Ferramentas para você cobrar certo e organizar cada venda.",
    items: [
      {
        to: "/calculadora",
        label: "Calculadora de Lucro",
        emoji: "🧮",
        testId: "nav-calculadora",
        description:
          "Descubra quanto cobrar em cada produto: insumos, tempo, margem e lucro por unidade calculados sozinho.",
      },
      {
        to: "/encomendas",
        label: "Encomendas",
        emoji: "📦",
        testId: "nav-encomendas",
        description:
          "Um painel simples com pedidos, prazos, clientes e valores. Nunca mais perca uma venda.",
      },
      {
        to: "/jornada",
        label: "Desafios",
        emoji: "🏆",
        testId: "nav-desafios",
        description:
          "Jornada gamificada com missões, medalhas e certificados a cada etapa concluída.",
      },
    ],
  },
  {
    id: "marca",
    label: "Minha Marca",
    iconKey: "palette",
    testId: "nav-group-marca",
    subtitle: "Parecer profissional",
    tagline: "Deixe sua marca com cara de profissional já no primeiro dia.",
    items: [
      {
        to: "/materiais",
        label: "Kits de Marketing",
        emoji: "🎨",
        testId: "nav-materiais",
        description:
          "Modelos prontos, scripts de WhatsApp e artes editáveis para você divulgar como uma marca de verdade.",
      },
      {
        to: "/minha-vitrine",
        label: "Minha Loja Virtual",
        emoji: "🛍️",
        testId: "nav-minha-vitrine",
        description:
          "Uma vitrine pública com o seu link, mostrando produtos, preços e formas de contato pro cliente comprar.",
      },
      {
        to: "/bonus-extra",
        label: "Bônus",
        emoji: "🎁",
        testId: "nav-bonus-extra",
        description:
          "Kit de logotipo, materiais extras e conteúdos-surpresa que aceleram sua marca desde o dia 1.",
      },
    ],
  },
];
