// Ícones line-art de traço fino, estilo editorial premium.
// Substituem os SVGs "chapados" antigos. Todos usam currentColor,
// strokeWidth 1.2 e traços harmonizados. viewBox padrão 24x24.

export const LINE_ICONS = {
  // Bolo caseiro — vista lateral, três camadas + vela
  bolo: `<path d="M3 20h18" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M4 20v-4h16v4" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M6 16v-3h12v3" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M8 13v-3h8v3" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M12 10V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M12 6c0-.8-.6-1.2-1-1.6.6-.6 1.4-.6 2 0-.4.4-1 .8-1 1.6z" fill="currentColor" opacity="0.9"/>`,

  // Rocambole — espiral em corte transversal
  rocambole: `<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M12 12a5.5 5.5 0 0 1 5.5-5.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M12 12a3.2 3.2 0 0 1 3.2-3.2" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/>`,

  // Hambúrguer — pão superior, recheio, pão inferior
  hamburguer: `<path d="M4 11c0-3 3.6-5 8-5s8 2 8 5" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4" y1="11" x2="20" y2="11" stroke="currentColor" stroke-width="1.2"/><path d="M5 13.5c1.5 0 3-.5 4.5.3 1.5.8 3 .8 4.5 0 1.5-.8 3-.3 4.5-.3" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4" y1="16.5" x2="20" y2="16.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 16.5c0 1.5 1 2.5 2.5 2.5h9c1.5 0 2.5-1 2.5-2.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="9" cy="8.5" r="0.6" fill="currentColor"/><circle cx="12" cy="7.5" r="0.6" fill="currentColor"/><circle cx="15" cy="8.5" r="0.6" fill="currentColor"/>`,

  // Sem lactose — gota d'água tachada
  lactosefree: `<path d="M12 4c-2.5 3-5 6.5-5 10a5 5 0 0 0 10 0c0-3.5-2.5-7-5-10z" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,

  // Sem glúten — espiga tachada
  glutenfree: `<path d="M12 4v16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M12 7c1.5-1 3-1 4 0M12 7c-1.5-1-3-1-4 0M12 11c1.5-1 3-1 4 0M12 11c-1.5-1-3-1-4 0M12 15c1.5-1 3-1 4 0M12 15c-1.5-1-3-1-4 0" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,

  // Sem açúcar — cubo tachado
  sugarfree: `<rect x="5" y="8" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="5" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><line x1="10" y1="8" x2="10" y2="18" stroke="currentColor" stroke-width="0.8" opacity="0.5"/><line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,

  // Geladinho — picolé/geladinho no palito
  geladinho: `<path d="M9 4h6c.6 0 1 .4 1 1v10a4 4 0 0 1-8 0V5c0-.6.4-1 1-1z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M9 8h6M9 12h6" stroke="currentColor" stroke-width="1" opacity="0.5"/><line x1="12" y1="18.5" x2="12" y2="21" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,

  // Kids — cupcake sorriso
  kids: `<path d="M6 12h12l-1 7c-.1.5-.5.8-1 .8H8c-.5 0-.9-.3-1-.8L6 12z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M6 12c0-2.5 2.5-4.5 6-4.5s6 2 6 4.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="10.2" cy="10.5" r="0.6" fill="currentColor"/><circle cx="13.8" cy="10.5" r="0.6" fill="currentColor"/><path d="M10.5 15c.5.5 1 .7 1.5.7s1-.2 1.5-.7" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/><path d="M12 7.5V5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="12" cy="4" r="1" stroke="currentColor" stroke-width="1.1" fill="none"/>`,

  // Ovo de páscoa — ovo com faixa central decorada
  ovo: `<path d="M12 3c-3.5 3.5-5.5 7.5-5.5 11a5.5 5.5 0 0 0 11 0c0-3.5-2-7.5-5.5-11z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M7.5 12.5c1.5.5 3 .5 4.5-.5s3 1 4.5.5" stroke="currentColor" stroke-width="1.1" fill="none"/><path d="M7 15.5c1.5-.5 3-.5 4.5.5s3-1 4.5-.5" stroke="currentColor" stroke-width="1.1" fill="none"/>`,
};

// -------------------------------------------------------------------------
// STYLE TOKENS: cada estilo pertence a UMA das 3 linguagens visuais.
// Isso garante que cada linguagem tenha personalidade distinta e que a
// escolha propague coerência para todos os módulos (Emblemas, Rótulos,
// Cartões, Cartões-fidelidade).
// -------------------------------------------------------------------------

export const LANGUAGES = {
  minimal: {
    name: "Minimal Premium",
    displayFont: "'Cormorant Garamond', 'Playfair Display', serif",
    sansFont: "'Inter', system-ui, sans-serif",
    ornaments: "none",       // nenhum ornamento decorativo
    corner: "sharp",         // cantos retos
    ringStyle: "off",        // sem fita atrás do texto de categoria
    dividerStyle: "hairline",
  },
  boutique: {
    name: "Boutique Elegante",
    displayFont: "'Playfair Display', 'Cormorant Garamond', serif",
    sansFont: "'Karla', system-ui, sans-serif",
    ornaments: "deco",       // florão, pequenas estrelas
    corner: "rounded",
    ringStyle: "filled",     // fita/faixa preenchida atrás do ringText
    dividerStyle: "double",
  },
  artesanal: {
    name: "Artesanal Contemporâneo",
    displayFont: "'Fraunces', Georgia, serif",
    sansFont: "'DM Mono', 'IBM Plex Mono', monospace",
    ornaments: "stamp",      // carimbo, filete grosso
    corner: "soft",
    ringStyle: "outline",    // apenas contorno com traço grosso
    dividerStyle: "stamp",
  },
};

// Substitui STYLES antigo. Mantém os mesmos IDs para BC.
export const STYLES = [
  {
    id: "moderno",
    name: "Moderno Minimal",
    lang: "minimal",
    palette: {
      bg: "#F7F3EC", ink: "#1A1A1A", accent: "#8B7355",
      ring: "#1A1A1A", inkSoft: "#5C5C5C",
    },
    stage: "linen",
  },
  {
    id: "escuro",
    name: "Escuro Premium",
    lang: "minimal",
    palette: {
      bg: "#141110", ink: "#EDE6D5", accent: "#C9A24B",
      ring: "#C9A24B", inkSoft: "#8B8578",
    },
    stage: "noir",
  },
  {
    id: "elegante",
    name: "Boutique Elegante",
    lang: "boutique",
    palette: {
      bg: "#FBF6EA", ink: "#1B1512", accent: "#B8873E",
      ring: "#4A222C", inkSoft: "#7a5a5f",
    },
    stage: "boutique",
  },
  {
    id: "vintage",
    name: "Vintage Padaria",
    lang: "boutique",
    palette: {
      bg: "#F1EEDD", ink: "#2F4C39", accent: "#9C4A34",
      ring: "#2F4C39", inkSoft: "#5b6b52",
    },
    stage: "linen",
  },
  {
    id: "rustico",
    name: "Rústico Kraft",
    lang: "artesanal",
    palette: {
      bg: "#E6D3A7", ink: "#2A1E12", accent: "#8B2E1F",
      ring: "#2A1E12", inkSoft: "#6b5843",
    },
    stage: "kraft",
  },
  {
    id: "divertido",
    name: "Divertido Artesanal",
    lang: "artesanal",
    palette: {
      bg: "#FBEFDA", ink: "#7A2A1E", accent: "#E0A23A",
      ring: "#C1442E", inkSoft: "#8a5a3d",
    },
    stage: "confeti",
  },
];

export const STAGE_BG = {
  kraft:    "repeating-linear-gradient(45deg, rgba(43,29,20,0.03) 0 2px, transparent 2px 10px), #E4D8B9",
  linen:    "repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0 1px, transparent 1px 6px), #ECE5D3",
  boutique: "radial-gradient(circle at 30% 20%, rgba(185,138,62,0.10), transparent 50%), #F1DED6",
  confeti:  "radial-gradient(circle at 10% 20%, rgba(224,162,58,0.14), transparent 40%), radial-gradient(circle at 80% 70%, rgba(193,68,46,0.10), transparent 40%), #F7E7C6",
  noir:     "radial-gradient(circle at 30% 20%, rgba(201,162,75,0.12), transparent 55%), #14100C",
};

export const SHAPES = [
  { id: "shield", name: "Escudo" },
  { id: "banner", name: "Banner" },
  { id: "hex",    name: "Hexágono" },
  { id: "mono",   name: "Monograma" },
  { id: "tag",    name: "Etiqueta" },
];

export function getStyle(styleId) {
  return STYLES.find((s) => s.id === styleId) || STYLES[2];
}

export function getLanguage(styleId) {
  const style = getStyle(styleId);
  return LANGUAGES[style.lang];
}
