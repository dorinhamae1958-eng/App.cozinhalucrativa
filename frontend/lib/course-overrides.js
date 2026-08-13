// Overrides aplicados sobre a estrutura de módulos vinda do Google Drive.
// Persistem mesmo se o curso for re-scraped, garantindo edições editoriais.
//
// Ordem de aplicação:
//   1. deleteLessonTitles       -> remove aulas por título original
//   2. moveLessonToStart        -> move + renomeia + define endAtSeconds
//   3. mergeModules             -> une módulos por título em um único
//   4. renameLessons            -> renomeia aulas (mapa old -> new)
//   5. renameModules            -> renomeia módulos (mapa old -> new)
//   5.5 moveLessonsToModule     -> move aulas para outro módulo (cria se não existir)
//   6. reorderModuleLessons     -> reordena/mantém apenas aulas listadas em um módulo
//   7. removeEmptyModules       -> descarta módulos vazios
//   8. moduleOrder              -> reordena módulos por título (não listados vão ao fim)

const OVERRIDES = {
  'bolos-caseiros': {
    // 1) Deleções (títulos originais vindos do Drive)
    deleteLessonTitles: [
      // Duplicatas "(1)"
      'Bolo+BlueVelvet (1)',
      'Bolo+de+Oreo (1)',
      'Bolo+KitKat (1)',
      'Bolo+Retangular (1)',
      'Tutorial+DripCake (1)',
      // Realocados para cursos afins (removidos daqui)
      'brigadeiro+Gourmet+',
      'Brigadeiro02+.pdf.pdf',
      'Brownie.pdf.pdf+(1)',
      'Receitas+de+Trufas',
      'Dicas+para+trufas+.pdf.pdf',
      'Doces+fit',
      'Doces+Variados.pdf.pdf',
      'GeladinhoGourmet',
      // Livros de desenvolvimento pessoal (viram bônus comum futuro)
      'livro-a-felicidade-comeca-com-voce',
      'livro-como-aumentar-sua-produtividade',
      'livro-o-poder-da-gratidao',
      'livro-voce-nasceu-para-vencer',
      // Criativos Vencedores — módulo inteiro deletado
      '1', '2', '3', '4', '5', '6', 'Bolo-Feed-01', 'Bolo-Stories-01',
      '[An01] — [Stories].zip',
      '[An02] — [Bolos Caseiros] (1).zip',
      // Planilhas do "Material do Curso"
      'Bolopreco',
      'Bolos',
      // Certificado genérico do "Material do Curso"
      'Certificado-para-curso-de-teologia-dourado-e-branco-elegante 2b55b24a5c7b4ff7be06ec2fa4f562e8',
    ],

    // 2) Vídeo de vendas -> Apresentação no início do Módulo 01 (0:00 → 2:34)
    moveLessonToStart: {
      findTitle: 'Inscrição — Bolos Caseiros',
      renameTo: 'Apresentação',
      targetModuleTitle: 'Módulo 01',
      startAtSeconds: 0,
      endAtSeconds: 154,
    },

    // 3) Unificar Módulos 03 e 04
    mergeModules: [
      { titles: ['Módulo 03', 'Módulo 04'], renameTo: 'Módulo 03 · Receitas' },
    ],

    // 4) Renomeações de aulas (títulos originais -> padronizados)
    renameLessons: {
      '[Ebook] Pão de Ló': 'E-book: Pão de Ló',
      // Receitas em PDF (irão para Bônus com prefixo "PDF –")
      'Bento+Cake': 'PDF – Receita: Bento Cake',
      'Bolo+BlueVelvet': 'PDF – Receita: Bolo Blue Velvet',
      'Bolo+Chocolatudo': 'PDF – Receita: Bolo Chocolatudo',
      'Bolo+de+Leite+ninho+Com+nutella': 'PDF – Receita: Bolo de Leite Ninho com Nutella',
      'Bolo+de+Oreo': 'PDF – Receita: Bolo de Oreo',
      'Bolo+Flower+Cake': 'PDF – Receita: Flower Cake',
      'Bolo+KitKat': 'PDF – Receita: Bolo KitKat',
      'Bolo+Retangular': 'PDF – Receita: Bolo Retangular',
      'BolonoPote': 'PDF – Receita: Bolo no Pote',
      'Bolo Vulcão': 'PDF – Receita: Bolo Vulcão',
      // Root file "Bolos Caseiros" (do módulo Material do Curso) -> apostila oficial
      'Bolos Caseiros': 'Apostila Oficial',
      // Material de Apoio "Bolos+Caseiros" (do Drive)
      'Bolos+Caseiros': 'Apostila – Bolos Caseiros',
      'coberturas+e+Recheios': 'Guia de Coberturas para Bolos',
      'Dicas+.pdf.pdf': 'Dicas para Confeitaria de Bolos',
      'Massas+Vol+2': 'Guia de Massas para Bolos – Volume 2',
      'MassasDeBolos': 'Guia de Massas para Bolos',
      'Recheios': 'Guia de Recheios para Bolos',
      'Tutorial+Bolo+Red+Velvet': 'PDF – Tutorial: Bolo Red Velvet',
      'Tutorial+Bolo+Sonho+de+Valsa+de+Chocolate': 'PDF – Tutorial: Bolo Sonho de Valsa',
      'Tutorial+DripCake': 'PDF – Tutorial: Drip Cake',
      // Logo + Lista de Públicos — realocados para Material de Apoio
      'Modelo de logo (1)': 'Logo da Marca',
      'Públicos de Interesses — Facebook': 'Lista de Públicos (Facebook)',
      'Lal Bolo no pote': 'Público Semelhante — Bolo no Pote',
      'Lal Bolos Caseiros': 'Público Semelhante — Bolos Caseiros',
      'Lal Recheios': 'Público Semelhante — Recheios',
      // Página de Vendas — renomear títulos genéricos
      'bolocaseiros': 'Página de Vendas – Bolos Caseiros',
      'elementor-1585-2022-08-18': 'Modelo Elementor – Página V1',
      'elementor-1594-2022-08-18': 'Modelo Elementor – Página V2',
      'elementor-2023-2022-08-18': 'Modelo Elementor – Página V3',
    },

    // 5) Renomeação de módulos (categorias)
    renameModules: {
      'Bônus': '📚 Material de Apoio',
    },

    // Mover aulas específicas para o módulo alvo (cria se não existir)
    moveLessonsToModule: [
      // Logo + Públicos -> Material de Apoio
      { fromTitle: 'Logo da Marca', toModuleTitle: '📚 Material de Apoio' },
      { fromTitle: 'Lista de Públicos (Facebook)', toModuleTitle: '📚 Material de Apoio' },
      { fromTitle: 'Público Semelhante — Bolo no Pote', toModuleTitle: '📚 Material de Apoio' },
      { fromTitle: 'Público Semelhante — Bolos Caseiros', toModuleTitle: '📚 Material de Apoio' },
      { fromTitle: 'Público Semelhante — Recheios', toModuleTitle: '📚 Material de Apoio' },
      // Apostila Oficial (era root file "Bolos Caseiros") -> Material de Apoio
      { fromTitle: 'Apostila Oficial', toModuleTitle: '📚 Material de Apoio' },
      // Receitas em PDF -> Bônus (cria o módulo)
      { fromTitle: 'PDF – Receita: Bolo no Pote', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bolo Retangular', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bolo Vulcão', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bolo Chocolatudo', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bolo de Leite Ninho com Nutella', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bolo de Oreo', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bolo KitKat', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bolo Blue Velvet', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Flower Cake', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bento Cake', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Tutorial: Drip Cake', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Tutorial: Bolo Red Velvet', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Tutorial: Bolo Sonho de Valsa', toModuleTitle: '🎁 Bônus' },
    ],

    // 6) Ordem final das aulas do Material de Apoio (também descarta o resto)
    reorderModuleLessons: {
      moduleTitle: '📚 Material de Apoio',
      order: [
        'Apostila Oficial',
        'E-book: Pão de Ló',
        'Apostila – Bolos Caseiros',
        'Guia de Massas para Bolos',
        'Guia de Massas para Bolos – Volume 2',
        'Guia de Recheios para Bolos',
        'Guia de Coberturas para Bolos',
        'Dicas para Confeitaria de Bolos',
        'Logo da Marca',
        'Lista de Públicos (Facebook)',
        'Público Semelhante — Bolo no Pote',
        'Público Semelhante — Bolos Caseiros',
        'Público Semelhante — Recheios',
      ],
    },

    removeEmptyModules: true,

    // 8) Ordem final dos módulos
    moduleOrder: [
      'Módulo 01',
      'Módulo 02',
      'Módulo 03 · Receitas',
      '📚 Material de Apoio',
      '🎁 Bônus',
      'Página de Vendas',
    ],
  },

  'hamburgao-lucrativo': {
    // Deletar VSL (aulas do módulo VSL)
    deleteLessonTitles: [
      'Hamburgue Lucrativo',
      'Hamgue VSL',
    ],
    removeEmptyModules: true,
    moduleOrder: [
      'Aulas',
      'Apostila Oficial',
      'Página de Vendas',
    ],
  },

  'receitas-low-carb': {
    // "VSL Low Carb" da pasta A entra no "01 Boas Vindas" e é movido para o topo como "Apresentação"
    moveLessonToStart: {
      findTitle: 'VSL Low Carb',
      renameTo: 'Apresentação',
      targetModuleTitle: '01 Boas Vindas',
    },
    // "Página de Vendas" contém arquivos técnicos (Elementor .zip) que não devem aparecer no curso
    deleteModuleTitles: [
      'Página de Vendas',
    ],
    renameLessons: {
      'Barrinhas de Nuts': 'Apostila – Barrinhas de Nuts',
      'Brigadeiro Low Carb': 'Apostila – Brigadeiro Low Carb',
      'Pão de Queijo': 'Apostila – Pão de Queijo',
      '01 apresentação': 'Introdução ao Curso',
    },
    renameModules: {
      '01 Boas Vindas': 'Módulo 01 – Boas Vindas',
      '02 Barrinha de Nuts': 'Módulo 02 – Barrinha de Nuts',
      '03 Brigadeiro': 'Módulo 03 – Brigadeiro',
      '04 Pão de Queijo': 'Módulo 04 – Pão de Queijo',
      "PDF's das Receitas": '📚 Materiais',
      'Criativos': '🎁 Bônus',
    },
    removeEmptyModules: true,
    moduleOrder: [
      'Módulo 01 – Boas Vindas',
      'Módulo 02 – Barrinha de Nuts',
      'Módulo 03 – Brigadeiro',
      'Módulo 04 – Pão de Queijo',
      '📚 Materiais',
      '🎁 Bônus',
    ],
  },

  'brigadeiro-gourmet': {
    renameLessons: {
      ' E-BOOK BRIGADEIRO GOURMET': 'E-book: Brigadeiro Gourmet',
      'E-BOOK BRIGADEIRO GOURMET': 'E-book: Brigadeiro Gourmet',
      'brigadeiro+gourmet+': 'Apostila – Brigadeiro Gourmet',
      'LOGO-BRIGADEIRO': 'Logo da Marca',
    },
    removeEmptyModules: true,
    moduleOrder: [
      '📚 Materiais',
      '🎁 Bônus',
    ],
  },

  'iogurtes-gourmet': {
    // O arquivo "Vendas.mp4" vem da pasta A e é injetado no "Módulo 01" pelo
    // extra_drive_folders. Movemos para o TOPO do módulo e renomeamos.
    moveLessonToStart: {
      findTitle: 'Vendas',
      renameTo: 'Apresentação',
      targetModuleTitle: 'Módulo 01',
    },
    // Itens removidos por decisão editorial:
    //  · "Delivery"                        -> movido para página de Bônus
    //  · "Planilha de Precificação"        -> não faz sentido para o aluno
    //  · Bloco-01/04, Capa-VSL, Icons, Img-Ygt-03, Iogurte-Box, modo-de-pagamento
    //    -> imagens técnicas de página de vendas, não são material para o aluno
    deleteLessonTitles: [
      'Delivery',
      'IOGURTE',
      'Bloco-01-Yogurte-Bkg',
      'Bloco-04-Bkg-2',
      'Capa-VSL-Ygt',
      'Icons-Yog',
      'Img-Ygt-03-1024x379',
      'Iogurte-Box-Pre195135O',
      'modo-de-pagamento-1-1-1',
    ],
    renameLessons: {
      'Iogurte+Caseiro+(1)': 'Apostila – Iogurte Caseiro',
      'Iogurte Caseiro': 'Apostila – Iogurte Caseiro',
      'Modelo de logo (3)': 'Logo da Marca',
    },
    renameModules: {
      'Imagens': 'Imagens para Divulgação',
    },
    removeEmptyModules: true,
    moduleOrder: [
      'Módulo 01',
      'Módulo 02',
      'Módulo 03',
      'Módulo 04',
      'Módulo 05',
      'Módulo 06',
      '📚 Materiais',
      '🎁 Bônus',
    ],
  },

  'rocambole-lucrativo': {
    // Deletar VSL (aulas do módulo Vsl)
    deleteLessonTitles: [
      'Vsl Rocambole',
      'VSL romcombole',
    ],
    removeEmptyModules: true,
    moduleOrder: [
      'Aulas',
      'Apostila Oficial',
      'Página de Vendas',
    ],
  },

  // ========== FONTES DA CONFEITARIA FUNCIONAL LUCRATIVA ==========
  // Deletar VSL + módulos "Vídeo de Vendas" + "Criativos" genéricos + reorganizar PDFs em Bônus
  'receitas-lactose': {
    deleteLessonTitles: [
      'VSL Sem Lactose',
      // Criativos genéricos
      '11', '12', '13', '14', '15',
    ],
    renameLessons: {
      // PDFs de receitas -> Bônus
      'Bolo de Banana': 'PDF – Receita: Bolo de Banana (Sem Lactose)',
      'Panqueca': 'PDF – Receita: Panqueca (Sem Lactose)',
      'Torta de Limão': 'PDF – Receita: Torta de Limão (Sem Lactose)',
      // Página de Vendas -> nomes descritivos
      'Pv Receitas Zero Lactose': 'Página de Vendas – Sem Lactose',
      'Elementor Pro 3.8.2.zip': 'Plugin Elementor Pro (backup)',
      'ultimate-elementor-1.30n.zip': 'Plugin Ultimate Elementor (backup)',
    },
    moveLessonsToModule: [
      { fromTitle: 'PDF – Receita: Bolo de Banana (Sem Lactose)', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Panqueca (Sem Lactose)', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Torta de Limão (Sem Lactose)', toModuleTitle: '🎁 Bônus' },
    ],
    removeEmptyModules: true,
    moduleOrder: [
      '01 Boas Vindas',
      '02 Bolo de Banana',
      '03 Panquecas',
      '04 Torta de Limão',
      'Apostila Oficial',
      '🎁 Bônus',
      'Página de Vendas',
    ],
  },

  'receitas-zero-gluten': {
    deleteLessonTitles: [
      'VSL Sem glúten',
      // Criativos genéricos
      '16', '17', '18', '19', '20',
    ],
    renameLessons: {
      'Bolo de Fubá': 'PDF – Receita: Bolo de Fubá (Sem Glúten)',
      'Pão de Amêndoas': 'PDF – Receita: Pão de Amêndoas (Sem Glúten)',
      'Torta de Maracujá': 'PDF – Receita: Torta de Maracujá (Sem Glúten)',
      'Pv Receitas Zero Glúten': 'Página de Vendas – Sem Glúten',
    },
    moveLessonsToModule: [
      { fromTitle: 'PDF – Receita: Bolo de Fubá (Sem Glúten)', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Pão de Amêndoas (Sem Glúten)', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Torta de Maracujá (Sem Glúten)', toModuleTitle: '🎁 Bônus' },
    ],
    removeEmptyModules: true,
    moduleOrder: [
      '01 Boas Vindas',
      '02 Pão Sem Glúten',
      '03 Bolo de Fubá',
      '04 Torta de Maracujá',
      'Apostila Oficial',
      '🎁 Bônus',
      'Página de Vendas',
    ],
  },

  'receitas-diabeticos': {
    deleteLessonTitles: [
      'VSL diabéticos',
      // Criativos genéricos
      '6', '7', '8', '9', 'Curso',
    ],
    renameLessons: {
      'Bolo de Baunilha Recheado': 'PDF – Receita: Bolo de Baunilha Recheado (Sem Açúcar)',
      'Bombons de Coco (Trufas)': 'PDF – Receita: Bombons de Coco / Trufas (Sem Açúcar)',
      'Queijadinha': 'PDF – Receita: Queijadinha (Sem Açúcar)',
      'Quindim': 'PDF – Receita: Quindim (Sem Açúcar)',
      'Pv Receitas Diabéticos': 'Página de Vendas – Doces Sem Açúcar',
    },
    moveLessonsToModule: [
      { fromTitle: 'PDF – Receita: Bolo de Baunilha Recheado (Sem Açúcar)', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Bombons de Coco / Trufas (Sem Açúcar)', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Queijadinha (Sem Açúcar)', toModuleTitle: '🎁 Bônus' },
      { fromTitle: 'PDF – Receita: Quindim (Sem Açúcar)', toModuleTitle: '🎁 Bônus' },
    ],
    removeEmptyModules: true,
    moduleOrder: [
      '01 Boas Vindas',
      '02 Quindim',
      '03 Queijadinha',
      '04 Bolo de Baunilha Recheado',
      '05 Trufas',
      'Apostila Oficial',
      '🎁 Bônus',
      'Página de Vendas',
    ],
  },

  'geladinhos-gourmet': {
    // Move o vídeo de venda para o Módulo 01 como primeiro vídeo (renomeado)
    moveLessonToStart: {
      findTitle: 'Inscrição — Geladinho Caseiro',
      renameTo: 'Apresentação',
      targetModuleTitle: 'Módulo 01',
    },
    // Deleta módulos inteiros (aplicado depois do move acima)
    deleteModuleTitles: [
      'Criativos',
      'Criativo Stories',
      'Lista de Públicos',
      'Vídeo de Vendas',
      'Vídeo VSL',
      'Imagens',
      'Material do Curso',
    ],
    // Renomeia aulas
    renameLessons: {
      'Geladinho+Gourmet': 'Apostila',
    },
    // Renomeia módulos
    renameModules: {
      'Capa Facebook': 'Imagens',
      'PDF - Material de Apoio': 'Material de Apoio',
      'Plr': 'Imagens de Apoio',
    },
    removeEmptyModules: true,
  },

  'receitas-kids': {
    // Apaga imagens 21 e 23 do módulo "Criativos" (o módulo em si também é removido abaixo).
    deleteLessonTitles: ['21', '23'],
    // Corta a faixa superior (rosa com texto "CURSO RECEITAS KIDS!") da imagem 25
    cropLessons: {
      '25': { cropTop: 11 },
    },
    // Remove módulos institucionais/marketing da sidebar dos alunos.
    deleteModuleTitles: [
      'Vídeo de Vendas',
      'Criativos',
    ],
    removeEmptyModules: true,
  },

  'plr-pascoa': {
    // 1) Apaga aulas específicas: Certificado e todas as planilhas
    deleteLessonTitles: [
      'Certificado Editável',
      'Planilha de Precificação',
      'Planilha de Precificação(1)',
    ],
    // 2) Migra "Bônus Como criar seu logotipo" para novo módulo "Bônus Extra"
    //    (moveLessonToStart cria o módulo no topo se não existir = "em cabeçalho")
    moveLessonToStart: {
      findTitle: 'Bônus Como criar seu logotipo',
      renameTo: 'Como criar seu logotipo',
      targetModuleTitle: 'Bônus Extra',
    },
    // 2.1) Move o VSL para o Módulo 01 (M1 - Comece por Aqui) como PRIMEIRO vídeo
    moveLessonsToModuleStart: [
      {
        findTitle: 'Vídeo de Venda Páscoa',
        renameTo: 'Apresentação',
        targetModuleTitle: 'M1 - Comece por Aqui',
      },
    ],
    // 3) Apaga módulos inteiros (roda depois do move -> a aula do logo já foi salva)
    deleteModuleTitles: [
      'Imagens para Banner Artes',
      'Criativos',
      'Criativos novos',
      'Links E Códigos',
      'M11 Bônus - Muito Além de Ovos!',
      'VSL',
    ],
    removeEmptyModules: true,
  },
};

const norm = (s) => (s || '')
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Bônus globais — vídeos disponíveis em TODOS os cursos e na rota /bonus.
// Extraídos de "M11 Bônus - Muito Além de Ovos!" (plr-pascoa) por serem
// conteúdos genéricos sobre NEGÓCIO/SUCESSO, aplicáveis a qualquer aluno.
export const GLOBAL_BONUSES = [
  {
    id: '1YfUU9quDtjMmwQOlQoOEg3f7dFADYaGP',
    title: 'Como criar seu logotipo',
    type: 'video',
    description: 'Passo a passo para desenhar um logotipo profissional para sua marca, sem depender de designer.',
  },
  {
    id: '11nWgvTEPgRkXEm2843n04Xvs_8g6_6zI',
    title: 'A Felicidade Começa com Você',
    type: 'pdf',
    description: 'E-book de desenvolvimento pessoal: descubra como cultivar felicidade genuína a partir do seu dia a dia.',
  },
  {
    id: '11qyQlVlQI14U57cvz3v8anOu1eMWlKVC',
    title: 'O Poder da Gratidão',
    type: 'pdf',
    description: 'E-book sobre gratidão: como o hábito diário de agradecer transforma sua mentalidade e seus resultados.',
  },
  {
    id: '11XD10O-7X5WaM14gnSIB8dEGzu5n3Zin',
    title: 'Como Aumentar Sua Produtividade',
    type: 'pdf',
    description: 'E-book prático para produzir mais em menos tempo — técnicas, foco e rotina de alta performance.',
  },
  {
    id: '11O9SF88tBKGuEQ8WE_o7w9Orq3La4k_S',
    title: 'Você Nasceu para Vencer',
    type: 'pdf',
    description: 'E-book motivacional: mentalidade de vencedor aplicada ao empreendedorismo e à vida.',
  },
];

// Alias mantido por compatibilidade com o restante do código.
export const LOGO_BONUS_LESSON = GLOBAL_BONUSES[1];

export function applyCourseModuleOverrides(course) {
  if (!course || !Array.isArray(course.modules)) return course;
  const rules = OVERRIDES[course.slug];
  let modules = course.modules.map((m) => ({ ...m, lessons: [...(m.lessons || [])] }));

  // Helper: strip any legacy "Bônus Extra" / "Bônus Geral" module from the
  // course. The universal bonuses (Como criar seu logotipo, Felicidade,
  // Gratidão, Produtividade, Você Nasceu para Vencer) now live EXCLUSIVELY
  // on the dedicated /bonus-extra route (menu "Aprender" → "Bônus"), so we
  // must not inject or keep them inside course modules.
  //
  // Also strips course-level "🎁 Bônus" (bônus específicos do curso, criados
  // via `course.bonuses` ou `extra_drive_folders`) — o usuário pediu para
  // remover TODOS os módulos de bônus das abas laterais dos cursos.
  const injectGlobalBonuses = (mods) => {
    const isBonus = (title) => {
      const t = norm(title || '');
      if (t === norm('Bônus Extra') || t === norm('Bônus Geral') || t === norm('Bônus')) return true;
      // "🎁 Bônus" e variantes com emoji ou prefixos ("Bônus Como criar…"):
      const raw = (title || '').toLowerCase();
      if (raw.includes('🎁')) return true;
      if (/(^|\s)b[oô]nus(\s|$)/i.test(title || '')) return true;
      return false;
    };
    return mods.filter((m) => !isBonus(m.title));
  };

  if (!rules) return { ...course, modules: injectGlobalBonuses(modules) };

  // 1) Delete lessons by title
  if (Array.isArray(rules.deleteLessonTitles) && rules.deleteLessonTitles.length) {
    const drop = new Set(rules.deleteLessonTitles.map(norm));
    modules = modules.map((m) => ({
      ...m,
      lessons: m.lessons.filter((l) => !drop.has(norm(l.title))),
    }));
  }

  // 2) Move a specific lesson to the START of a target module (rename + endAt)
  if (rules.moveLessonToStart) {
    const cfg = rules.moveLessonToStart;
    const findKey = norm(cfg.findTitle);
    const targetKey = norm(cfg.targetModuleTitle);
    let moved = null;

    modules = modules.map((m) => {
      const kept = [];
      for (const l of m.lessons) {
        if (!moved && norm(l.title) === findKey) {
          moved = { ...l };
        } else {
          kept.push(l);
        }
      }
      return { ...m, lessons: kept };
    });

    if (moved) {
      if (cfg.renameTo) moved.title = cfg.renameTo;
      if (typeof cfg.endAtSeconds === 'number') moved.end_at_seconds = cfg.endAtSeconds;
      if (typeof cfg.startAtSeconds === 'number') moved.start_at_seconds = cfg.startAtSeconds;
      moved.is_presentation = true;

      const targetIdx = modules.findIndex((m) => norm(m.title) === targetKey);
      if (targetIdx >= 0) {
        modules[targetIdx] = {
          ...modules[targetIdx],
          lessons: [moved, ...modules[targetIdx].lessons],
        };
      } else {
        modules.unshift({
          id: `${course.slug}-apresentacao`,
          title: cfg.targetModuleTitle || 'Módulo 01',
          lessons: [moved],
        });
      }
    }
  }

  // 2b) Same as moveLessonToStart but for MULTIPLE lessons.
  const batchMoves = Array.isArray(rules.moveLessonsToModuleStart) ? rules.moveLessonsToModuleStart : [];
  for (const cfg of batchMoves) {
    const findKey = norm(cfg.findTitle);
    const targetKey = norm(cfg.targetModuleTitle);
    let moved = null;
    modules = modules.map((m) => {
      const kept = [];
      for (const l of m.lessons) {
        if (!moved && norm(l.title) === findKey) {
          moved = { ...l };
        } else {
          kept.push(l);
        }
      }
      return { ...m, lessons: kept };
    });
    if (moved) {
      if (cfg.renameTo) moved.title = cfg.renameTo;
      if (typeof cfg.endAtSeconds === 'number') moved.end_at_seconds = cfg.endAtSeconds;
      if (typeof cfg.startAtSeconds === 'number') moved.start_at_seconds = cfg.startAtSeconds;
      if (cfg.markAsPresentation) moved.is_presentation = true;
      const targetIdx = modules.findIndex((m) => norm(m.title) === targetKey);
      if (targetIdx >= 0) {
        modules[targetIdx] = {
          ...modules[targetIdx],
          lessons: [moved, ...modules[targetIdx].lessons],
        };
      } else {
        modules.unshift({
          id: `${course.slug}-${targetKey.replace(/[^a-z0-9]+/g, '-')}`,
          title: cfg.targetModuleTitle,
          lessons: [moved],
        });
      }
    }
  }

  // 2.5) Delete entire modules by title (runs AFTER moveLessonToStart so
  //      lessons can be rescued from a module before it is dropped).
  if (Array.isArray(rules.deleteModuleTitles) && rules.deleteModuleTitles.length) {
    const dropMods = new Set(rules.deleteModuleTitles.map(norm));
    modules = modules.filter((m) => !dropMods.has(norm(m.title)));
  }

  // 3) Merge modules (concat lessons of matching modules into first, rename)
  if (Array.isArray(rules.mergeModules)) {
    for (const merge of rules.mergeModules) {
      const keys = merge.titles.map(norm);
      const matchedIdxs = [];
      modules.forEach((m, i) => { if (keys.includes(norm(m.title))) matchedIdxs.push(i); });
      if (matchedIdxs.length < 2) continue;
      const firstIdx = matchedIdxs[0];
      const first = modules[firstIdx];
      const mergedLessons = matchedIdxs
        .map((i) => modules[i].lessons || [])
        .reduce((acc, arr) => acc.concat(arr), []);
      const mergedModule = {
        ...first,
        title: merge.renameTo || first.title,
        lessons: mergedLessons,
      };
      // Rebuild without the merged extras
      const dropSet = new Set(matchedIdxs.slice(1));
      modules = modules
        .map((m, i) => (i === firstIdx ? mergedModule : m))
        .filter((_, i) => !dropSet.has(i));
    }
  }

  // 4) Rename lessons
  if (rules.renameLessons && Object.keys(rules.renameLessons).length) {
    const map = new Map(Object.entries(rules.renameLessons).map(([k, v]) => [norm(k), v]));
    modules = modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => {
        const nt = map.get(norm(l.title));
        return nt ? { ...l, title: nt } : l;
      }),
    }));
  }

  // 5) Rename modules
  if (rules.renameModules && Object.keys(rules.renameModules).length) {
    const map = new Map(Object.entries(rules.renameModules).map(([k, v]) => [norm(k), v]));
    modules = modules.map((m) => {
      const nt = map.get(norm(m.title));
      return nt ? { ...m, title: nt } : m;
    });
  }

  // 5.1) Apply per-lesson crop overrides (by original title) so the image
  //      display uses the /api/drive-image proxy with cropTop/etc query params.
  if (rules.cropLessons && Object.keys(rules.cropLessons).length) {
    const map = new Map(Object.entries(rules.cropLessons).map(([k, v]) => [norm(k), v]));
    modules = modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => {
        const c = map.get(norm(l.title));
        if (!c) return l;
        const qs = new URLSearchParams(
          Object.entries(c).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, String(v)])
        ).toString();
        return { ...l, crop: c, url: `/api/drive-image/${l.id}${qs ? `?${qs}` : ''}` };
      }),
    }));
  }

  // 5.5) Move specific lessons (by current title) to another module (appended).
  //     Runs after renames -> both fromTitle and toModuleTitle use the *current* names.
  //     If target module does not exist, it is auto-created at the end.
  if (Array.isArray(rules.moveLessonsToModule) && rules.moveLessonsToModule.length) {
    for (const cfg of rules.moveLessonsToModule) {
      const fromKey = norm(cfg.fromTitle);
      const toKey = norm(cfg.toModuleTitle);
      let picked = null;
      modules = modules.map((m) => {
        if (norm(m.title) === toKey) return m; // skip source is target
        const kept = [];
        for (const l of m.lessons) {
          if (!picked && norm(l.title) === fromKey) {
            picked = { ...l };
          } else {
            kept.push(l);
          }
        }
        return { ...m, lessons: kept };
      });
      if (picked) {
        let targetIdx = modules.findIndex((m) => norm(m.title) === toKey);
        if (targetIdx < 0) {
          modules.push({
            id: `${course.slug}-${toKey.replace(/[^a-z0-9]+/g, '-')}`,
            title: cfg.toModuleTitle,
            lessons: [],
          });
          targetIdx = modules.length - 1;
        }
        modules[targetIdx] = {
          ...modules[targetIdx],
          lessons: [...modules[targetIdx].lessons, picked],
        };
      }
    }
  }

  // 6) Reorder + keep only listed lessons in a specific module
  if (rules.reorderModuleLessons) {
    const cfg = rules.reorderModuleLessons;
    const targetKey = norm(cfg.moduleTitle);
    const orderKeys = cfg.order.map(norm);
    modules = modules.map((m) => {
      if (norm(m.title) !== targetKey) return m;
      const byKey = new Map(m.lessons.map((l) => [norm(l.title), l]));
      const ordered = [];
      for (const k of orderKeys) {
        const l = byKey.get(k);
        if (l) ordered.push(l);
      }
      return { ...m, lessons: ordered };
    });
  }

  // 7) Drop empty modules
  if (rules.removeEmptyModules) {
    modules = modules.filter((m) => (m.lessons || []).length > 0);
  }

  // 8) Reorder modules according to explicit list. Modules not in the list
  //    are appended at the end preserving their relative order.
  if (Array.isArray(rules.moduleOrder) && rules.moduleOrder.length) {
    const orderKeys = rules.moduleOrder.map(norm);
    const byKey = new Map();
    const leftovers = [];
    for (const m of modules) {
      const k = norm(m.title);
      if (orderKeys.includes(k) && !byKey.has(k)) {
        byKey.set(k, m);
      } else {
        leftovers.push(m);
      }
    }
    const ordered = [];
    for (const k of orderKeys) {
      const m = byKey.get(k);
      if (m) ordered.push(m);
    }
    modules = [...ordered, ...leftovers];
  }

  // Última etapa: injeta bônus globais (agora que módulos deletados já sumiram).
  modules = injectGlobalBonuses(modules);

  return { ...course, modules };
}
