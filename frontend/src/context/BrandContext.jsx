import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";

/**
 * BrandContext — fonte única da identidade da marca.
 *
 * Persistência:
 *   - Estado local em localStorage (chave "cl.brand_profile.v1")
 *   - Migração automática na primeira montagem a partir de /api/vitrine/me
 *     (importa store_name, tagline, whatsapp existentes)
 *
 * Consumido por: Emblemas, Rótulos, Cartões, Cartão-fidelidade, banners e
 * demais materiais do "Kit da Marca". Quando a usuária edita o nome uma vez,
 * TODOS os módulos se atualizam automaticamente.
 */

const STORAGE_KEY = "cl.brand_profile.v1";

export const DEFAULT_BRAND_PROFILE = {
  name: "",              // Nome da marca (ex.: "DELÍCIAS LUCRATIVAS")
  slogan: "",            // Slogan curto exibido nos materiais
  instagram: "",         // "@usuario"
  whatsapp: "",          // apenas dígitos
  city: "",              // "São Paulo · SP"
  foundedYear: "",       // "2024"
  packageMessage: "",    // frase padrão da embalagem/cartão
  logoDataUrl: null,     // base64 da logo (com auto-crop já aplicado)
  styleId: "elegante",   // id de STYLES em materiaisData
  shape: "shield",       // formato padrão do emblema
};

function loadFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BRAND_PROFILE, ...parsed };
  } catch {
    return null;
  }
}

function saveToStorage(profile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // silently ignore quota errors
  }
}

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const [profile, setProfile] = useState(() => loadFromStorage() || DEFAULT_BRAND_PROFILE);
  const [migrated, setMigrated] = useState(!!loadFromStorage());

  // Migração automática: se localStorage estava vazio, importa dados da Vitrine.
  useEffect(() => {
    if (migrated) return;
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get("/vitrine/me");
        if (cancel) return;
        const imported = {
          ...DEFAULT_BRAND_PROFILE,
          name: (data?.store_name || "").toUpperCase(),
          slogan: data?.tagline || "",
          whatsapp: (data?.whatsapp || "").toString(),
          packageMessage: data?.intro_message || "",
        };
        setProfile(imported);
        saveToStorage(imported);
      } catch {
        // não autenticado ou API indisponível: mantém default
      } finally {
        if (!cancel) setMigrated(true);
      }
    })();
    return () => { cancel = true; };
  }, [migrated]);

  const updateProfile = useCallback((patch) => {
    setProfile((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_BRAND_PROFILE);
    saveToStorage(DEFAULT_BRAND_PROFILE);
  }, []);

  // Sincroniza campos compartilhados de volta para a Vitrine (best-effort).
  const syncToVitrine = useCallback(async () => {
    try {
      await api.put("/vitrine/me", {
        store_name: profile.name,
        tagline: profile.slogan,
        whatsapp: profile.whatsapp,
        intro_message: profile.packageMessage,
      });
      return true;
    } catch {
      return false;
    }
  }, [profile.name, profile.slogan, profile.whatsapp, profile.packageMessage]);

  const value = useMemo(
    () => ({ profile, updateProfile, resetProfile, syncToVitrine }),
    [profile, updateProfile, resetProfile, syncToVitrine],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand deve ser usado dentro de <BrandProvider>");
  return ctx;
}
