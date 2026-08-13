import { api } from "@/lib/api";

/**
 * Client IA — chama endpoints Python /api/ai/* servidos pelo FastAPI
 * (Claude Sonnet 4.6 via Emergent Universal Key).
 */

// Mapeia o styleId escolhido (moderno/escuro/elegante/vintage/rustico/divertido)
// para uma das 3 linguagens visuais que o prompt entende.
const STYLE_TO_LANG = {
  moderno: "minimal",
  escuro: "minimal",
  elegante: "boutique",
  vintage: "boutique",
  rustico: "artesanal",
  divertido: "artesanal",
};

export function styleIdToLanguage(styleId) {
  return STYLE_TO_LANG[styleId] || "boutique";
}

export async function generateSlogan({ brandName, styleId, city, specialty }) {
  const { data } = await api.post("/ai/slogan", {
    brand_name: brandName,
    language: styleIdToLanguage(styleId),
    city: city || null,
    specialty: specialty || null,
  });
  return data.slogan;
}

export async function generateProductDescription({ productName, tagline, styleId, brandName }) {
  const { data } = await api.post("/ai/product-description", {
    product_name: productName,
    tagline: tagline || null,
    language: styleIdToLanguage(styleId),
    brand_name: brandName || null,
  });
  return data.description;
}
