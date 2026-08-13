import React, { useRef, useState } from "react";
import { Download, Wand2 } from "lucide-react";
import { EmblemaShape } from "./EmblemaShape";
import { STYLES, LANGUAGES, TRILHAS, STAGE_BG } from "./materiaisData";
import { downloadSvgAsPng } from "./exportUtils";
import { useBrand } from "@/context/BrandContext";
import { generateProductDescription } from "@/lib/aiClient";

/**
 * EmblemasTab v2 — consome BrandContext.
 * A usuária ajusta a marca UMA vez no BrandIdentityForm; esta aba apenas
 * mostra a coleção completa (emblema + cartela) para cada produto.
 */

export default function EmblemasTab() {
  const { profile } = useBrand();
  const style = STYLES.find((s) => s.id === profile.styleId) || STYLES[2];
  const lang = LANGUAGES[style.lang];
  const shape = profile.shape || "shield";
  const brand = profile.name || "SUA MARCA";
  const customLogoUrl = profile.logoDataUrl;
  const foundedYear = profile.foundedYear;

  return (
    <div data-testid="emblemas-tab">
      {TRILHAS.map((trilha) => (
        <div key={trilha.id} className="mb-10">
          <div className="mb-4 flex items-baseline gap-3 flex-wrap">
            <h2
              className="font-display text-2xl font-black leading-tight"
              style={{ color: "#2E1B12", fontFamily: lang.displayFont }}
            >
              {trilha.nome}
            </h2>
            <span className="text-sm" style={{ color: "#8A7864" }}>
              · {trilha.sub}
            </span>
          </div>

          <div
            className="mat-stage grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            style={{ background: STAGE_BG[style.stage] || STAGE_BG.kraft }}
          >
            {trilha.produtos.map((p) => (
              <ProductEmblemCard
                key={`${trilha.id}-${p.key}`}
                product={p}
                shape={shape}
                style={style}
                lang={lang}
                brand={brand}
                foundedYear={foundedYear}
                customLogoUrl={customLogoUrl}
                packageMessage={profile.packageMessage}
                slogan={profile.slogan}
                instagram={profile.instagram}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductEmblemCard({ product, shape, style, lang, brand, foundedYear, customLogoUrl, slogan, instagram }) {
  const svgRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [desc, setDesc] = useState(product.desc);
  const [descKey, setDescKey] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const isDark = style.stage === "noir";
  const palette = style.palette;

  const handleGenerateDesc = async () => {
    setAiError("");
    setAiLoading(true);
    try {
      const text = await generateProductDescription({
        productName: product.nome,
        tagline: product.tagline,
        styleId: style.id,
        brandName: brand,
      });
      if (text) {
        setDesc(text);
        setDescKey((k) => k + 1);
      }
    } catch {
      setAiError("Falha ao gerar. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      const slug = (s) =>
        (s || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      const filename = `emblema-${shape}-${slug(brand) || "marca"}-${slug(product.nome)}.png`;
      await downloadSvgAsPng(svgRef.current, filename, 4);
    } catch (e) {
      setDownloadError("Não deu para gerar o PNG. Tente outro navegador ou uma logo menor.");
      console.error("PNG export failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p
        className="text-[10px] font-black uppercase tracking-[0.28em]"
        style={{ color: isDark ? "#EDE6D5" : "#6b5843", fontFamily: lang.sansFont }}
      >
        Emblema
      </p>
      <EmblemaShape
        ref={svgRef}
        shape={shape}
        size={200}
        style={style}
        lang={lang}
        iconKey={product.key}
        customLogoUrl={customLogoUrl}
        ringText={product.ring}
        brand={brand}
        foundedYear={foundedYear}
      />

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        data-testid={`download-emblema-${product.key}`}
        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
        style={{ background: isDark ? palette.accent : "#A24D2A", color: isDark ? "#221D16" : "#fff" }}
      >
        <Download className="h-3.5 w-3.5" />
        {downloading ? "Gerando…" : "Baixar PNG"}
      </button>
      {downloadError && (
        <p className="text-[11px] font-semibold" style={{ color: "#C0392B" }} role="alert">
          {downloadError}
        </p>
      )}

      {/* Cartela editorial: usa fontes da linguagem */}
      <div
        className="mat-plabel w-full max-w-[300px]"
        style={{
          background: palette.bg,
          border: `1.5px solid ${palette.accent}`,
          color: palette.ink,
          fontFamily: lang.sansFont,
        }}
      >
        <div className="mx-auto mb-3 flex justify-center">
          <EmblemaShape
            shape={shape}
            size={92}
            style={style}
            lang={lang}
            iconKey={product.key}
            customLogoUrl={customLogoUrl}
            ringText={product.ring}
            brand={brand}
          />
        </div>
        <h3
          className="mat-editable font-black leading-tight"
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: 22, fontFamily: lang.displayFont, color: palette.ink }}
        >
          {product.nome}
        </h3>
        <p
          className="mat-editable mt-1"
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: palette.accent,
          }}
        >
          {product.tagline}
        </p>
        {product.claim && (
          <span
            className="mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide"
            style={{ borderColor: palette.accent, color: palette.accent }}
          >
            {product.claim}
          </span>
        )}
        <hr
          className="mx-auto my-3 w-2/3 border-none border-t border-dashed opacity-60"
          style={{ borderColor: palette.accent }}
        />
        <p
          key={descKey}
          className="mat-editable mx-1 leading-relaxed"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => setDesc(e.currentTarget.textContent || "")}
          style={{ fontSize: 12, color: palette.inkSoft }}
        >
          {desc}
        </p>
        <div className="mt-2 flex items-center justify-center">
          <button
            type="button"
            onClick={handleGenerateDesc}
            disabled={aiLoading}
            data-testid={`ai-generate-desc-${product.key}`}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
            title="Reescrever a descrição com IA (Claude)"
          >
            <Wand2 className="h-3 w-3" />
            {aiLoading ? "Gerando…" : "Reescrever com IA"}
          </button>
        </div>
        {aiError && (
          <p className="mt-1 text-center text-[10px] font-semibold" style={{ color: "#C0392B" }} role="alert">
            {aiError}
          </p>
        )}
        <div
          className="mt-4 flex justify-between border-t pt-2 text-[9px] uppercase"
          style={{ borderColor: "rgba(0,0,0,0.08)", color: palette.inkSoft, letterSpacing: "0.06em" }}
        >
          <span>{instagram || "@sua_marca"}</span>
          <span>lote: ____</span>
        </div>
      </div>
    </div>
  );
}
