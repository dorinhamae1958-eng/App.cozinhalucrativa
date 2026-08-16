import { api } from "@/lib/api";

const KEY = "cl_ref";
const TS_KEY = "cl_ref_ts";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias de atribuição

function normalize(code) {
  return (code || "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase().slice(0, 24);
}

// Lê ?ref= da URL, salva no localStorage e registra o clique no backend.
export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref");
    if (!raw) return;
    const code = normalize(raw);
    if (!code) return;
    localStorage.setItem(KEY, code);
    localStorage.setItem(TS_KEY, String(Date.now()));
    api.get("/affiliates/track", { params: { code } }).catch(() => {});
  } catch {
    /* ignore */
  }
}

// Retorna o código do afiliado ainda válido (dentro da janela de atribuição).
export function getRef() {
  if (typeof window === "undefined") return null;
  try {
    const code = localStorage.getItem(KEY);
    const ts = Number(localStorage.getItem(TS_KEY) || 0);
    if (!code) return null;
    if (ts && Date.now() - ts > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(TS_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}
