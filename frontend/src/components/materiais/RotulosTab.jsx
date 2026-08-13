import React, { useRef } from "react";
import { Printer } from "lucide-react";
import { TRILHAS, STYLES, LANGUAGES } from "./materiaisData";
import { useBrand } from "@/context/BrandContext";
import { escapeHtml } from "@/lib/html";

// Rótulos prontos para impressão em folha A4 (8 por folha).
// Consome BrandContext (nome da marca, Instagram, estilo).

export default function RotulosTab() {
  const printRef = useRef(null);
  const { profile } = useBrand();
  const style = STYLES.find((s) => s.id === profile.styleId) || STYLES[2];
  const lang = LANGUAGES[style.lang];
  const brand = profile.name || "SUA MARCA";
  const instagram = profile.instagram || "@sua_marca";

  const printLabel = (produto, linha) => {
    const html = build8UpPage(produto, linha, { brand, instagram, style, lang });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=900,height=1200");
    if (!w) {
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => {
      try { w.print(); } catch (err) { console.debug("print failed", err); }
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 400);
  };

  return (
    <div ref={printRef}>
      <div
        className="materiais-toolbar mb-6 rounded-2xl border p-5"
        style={{ borderColor: "#EED3C3", background: "rgba(255,255,255,0.7)" }}
      >
        <h3 className="font-display text-lg font-black" style={{ color: "#2E1B12" }}>
          Rótulos prontos para imprimir
        </h3>
        <p className="mt-1 text-sm" style={{ color: "#5F4A3F" }}>
          Clique em qualquer texto para editar, depois use <b>“Imprimir folha”</b> para gerar uma
          folha A4 com 8 rótulos idênticos do produto, pronta para recortar.
        </p>
        <p className="mt-3 rounded-md border-l-4 p-3 text-xs" style={{ background: "#FFF7E6", borderColor: "#D89A5B", color: "#7A5A1E" }}>
          <b>Atenção:</b> rótulos de alimentos têm regras da ANVISA sobre alergênicos e informação
          nutricional (ex.: Lei 10.674/2003, glúten). Estes textos são um ponto de partida.
          Confirme as exigências para o seu tipo de produção antes de usar comercialmente.
        </p>
      </div>

      {TRILHAS.map((trilha) => (
        <section key={trilha.id} className="mb-12">
          <div className="mb-4 flex items-baseline gap-3 flex-wrap">
            <h2 className="font-display text-2xl font-black" style={{ color: "#2E1B12", fontFamily: lang.displayFont }}>
              {trilha.nome}
            </h2>
            <span className="text-sm" style={{ color: "#8A7864" }}>
              · {trilha.sub}
            </span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {trilha.produtos.map((p) => (
              <RotuloCard
                key={`${trilha.id}-${p.key}`}
                produto={p}
                linha={trilha.linha}
                brand={brand}
                instagram={instagram}
                style={style}
                lang={lang}
                onPrint={() => printLabel(p, trilha.linha)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RotuloCard({ produto, linha, brand, instagram, style, lang, onPrint }) {
  const palette = style.palette;
  return (
    <div
      data-testid={`rotulo-${produto.key}`}
      className="flex flex-col overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: palette.accent + "55", background: palette.bg, fontFamily: lang.sansFont, color: palette.ink }}
    >
      <div
        className="flex items-center justify-between px-5 pt-4 text-[10px] font-black uppercase tracking-[0.25em]"
        style={{ color: palette.accent }}
      >
        <span>{brand}</span>
        <span>{linha}</span>
      </div>

      <div className="px-5 py-3">
        <h3
          className="mat-editable font-black leading-tight"
          contentEditable
          suppressContentEditableWarning
          style={{ fontFamily: lang.displayFont, color: palette.ink, fontSize: "1.55rem" }}
        >
          {produto.nome}
        </h3>
        <p className="mat-editable mt-1 text-sm" contentEditable suppressContentEditableWarning style={{ color: palette.accent }}>
          {produto.tagline}
        </p>
        {produto.claim && (
          <span
            className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide"
            style={{ background: palette.accent, color: palette.bg }}
          >
            {produto.claim}
          </span>
        )}
      </div>

      <div className="mx-5 my-2 h-px" style={{ background: palette.accent + "55" }} />

      <dl className="px-5 py-2 text-[13px] leading-snug" style={{ color: palette.ink }}>
        <div className="mb-2 flex justify-between gap-3">
          <dt className="font-black uppercase tracking-wider text-[10px]" style={{ color: palette.inkSoft }}>
            Peso / Rendimento
          </dt>
          <dd className="mat-editable text-right" contentEditable suppressContentEditableWarning>
            {produto.peso}
          </dd>
        </div>
        <div className="mb-2 flex justify-between gap-3">
          <dt className="font-black uppercase tracking-wider text-[10px]" style={{ color: palette.inkSoft }}>
            Validade
          </dt>
          <dd className="mat-editable text-right" contentEditable suppressContentEditableWarning>
            {produto.validade}
          </dd>
        </div>
        <div className="mb-2">
          <dt className="font-black uppercase tracking-wider text-[10px]" style={{ color: palette.inkSoft }}>
            Contém
          </dt>
          <dd className="mat-editable mt-0.5" contentEditable suppressContentEditableWarning>
            {produto.contem}
          </dd>
        </div>
      </dl>

      <div className="mx-5 my-2 h-px" style={{ background: palette.accent + "55" }} />

      <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-1 text-[9px] uppercase" style={{ color: palette.inkSoft, letterSpacing: "0.06em" }}>
        <span>{instagram}</span>
        <span>lote: ____</span>
      </div>

      <button
        type="button"
        data-testid={`print-${produto.key}`}
        onClick={onPrint}
        className="no-print mx-5 mb-5 inline-flex items-center justify-center gap-2 rounded-full py-2 text-xs font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.02]"
        style={{ background: palette.accent }}
      >
        <Printer className="h-3.5 w-3.5" /> Imprimir folha (8 por A4)
      </button>
    </div>
  );
}

function build8UpPage(produto, linha, { brand, instagram, style, lang }) {
  const palette = style.palette;
  // Escape all user-controlled strings before interpolating into the printed
  // HTML document (prevents XSS from malicious brand/product data).
  const safeBrand = escapeHtml(brand);
  const safeInstagram = escapeHtml(instagram);
  const safeLinha = escapeHtml(linha);
  const safeNome = escapeHtml(produto.nome);
  const safeTagline = escapeHtml(produto.tagline);
  const safeClaim = produto.claim ? escapeHtml(produto.claim) : "";
  const safePeso = escapeHtml(produto.peso);
  const safeValidade = escapeHtml(produto.validade);
  const safeContem = escapeHtml(produto.contem);
  const claim = safeClaim ? `<span class="claim">${safeClaim}</span>` : "";

  const card = `
    <div class="card">
      <div class="head"><span>${safeBrand}</span><span>${safeLinha}</span></div>
      <h3>${safeNome}</h3>
      <p class="tag">${safeTagline}</p>
      ${claim}
      <hr>
      <dl>
        <div><dt>Peso / Rendimento</dt><dd>${safePeso}</dd></div>
        <div><dt>Validade</dt><dd>${safeValidade}</dd></div>
        <div><dt>Contém</dt><dd>${safeContem}</dd></div>
      </dl>
      <hr>
      <div class="foot"><span>${safeInstagram}</span><span>lote: ____</span></div>
    </div>
  `;
  const grid = new Array(8).fill(card).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
    <title>${safeNome} · Rótulos</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Playfair+Display:wght@700;800&family=Fraunces:wght@600;700;800&family=Inter:wght@400;600;700&family=Karla:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #f4eee1; font-family: ${lang.sansFont}; color: ${palette.ink}; }
      .sheet {
        width: 210mm; height: 297mm; margin: 0 auto; padding: 8mm; background: #fff;
        display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); gap: 4mm;
      }
      .card {
        border: 1.4px solid ${palette.accent}55; border-radius: 8px; padding: 8mm 8mm 6mm;
        background: ${palette.bg}; position: relative; overflow: hidden;
        display: flex; flex-direction: column;
      }
      .head { display: flex; justify-content: space-between; font-size: 8px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; color: ${palette.accent}; }
      h3 { font-family: ${lang.displayFont}; font-weight: 800; font-size: 16px; margin: 4px 0 2px; color: ${palette.ink}; line-height: 1.05; }
      .tag { font-size: 10px; color: ${palette.accent}; margin: 0 0 4px; }
      .claim { display: inline-block; font-size: 8px; font-weight: 800; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 20px; background: ${palette.accent}; color: ${palette.bg}; text-transform: uppercase; }
      hr { border: none; border-top: 1px solid ${palette.accent}55; margin: 5px 0; }
      dl { margin: 0; font-size: 9.5px; line-height: 1.35; color: ${palette.ink}; flex: 1; }
      dl div { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 3px; }
      dt { font-size: 7.5px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: ${palette.inkSoft}; }
      dd { margin: 0; text-align: right; }
      .foot { display: flex; justify-content: space-between; font-size: 7.5px; letter-spacing: 0.12em; text-transform: uppercase; color: ${palette.inkSoft}; }
    </style></head><body>
    <div class="sheet">${grid}</div>
    </body></html>`;
}
