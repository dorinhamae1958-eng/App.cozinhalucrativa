import React, { useMemo, useRef, useState } from "react";
import { Printer, RotateCcw, Heart } from "lucide-react";
import { useBrand } from "@/context/BrandContext";
import { STYLES, LANGUAGES } from "./materiaisData";

// Cartões de Agradecimento e Fidelidade. Consomem BrandContext.
export default function CartoesTab() {
  const { profile } = useBrand();
  const style = STYLES.find((s) => s.id === profile.styleId) || STYLES[2];
  const lang = LANGUAGES[style.lang];

  const [stampCount, setStampCount] = useState(10);
  const [filled, setFilled] = useState(() => new Set());

  const cols = Math.min(stampCount, 5);
  const stamps = useMemo(() => Array.from({ length: stampCount }, (_, i) => i), [stampCount]);

  const toggle = (i) => {
    setFilled((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i); else s.add(i);
      return s;
    });
  };

  const resetStamps = () => setFilled(new Set());

  const thanksRef = useRef(null);
  const loyaltyRef = useRef(null);

  const printThanks = () => printGrid("thanks", 4, thanksState);
  const printLoyalty = () => printGrid("loyalty", 4, loyaltyState);

  const captureFrom = (ref) => (ref.current ? ref.current.outerHTML : "");
  const thanksState = () => captureFrom(thanksRef);
  const loyaltyState = () => captureFrom(loyaltyRef);

  return (
    <div>
      {/* CONTROLES */}
      <div
        className="materiais-toolbar mb-6 rounded-2xl border p-5"
        style={{ borderColor: "#EED3C3", background: "rgba(255,255,255,0.7)" }}
      >
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label
              className="mb-1 block text-xs font-black uppercase tracking-widest"
              style={{ color: "#A24D2A" }}
              htmlFor="stampCount"
            >
              Carimbos até o brinde
            </label>
            <input
              id="stampCount"
              data-testid="stamp-count"
              type="number"
              min={4}
              max={15}
              value={stampCount}
              onChange={(e) => {
                let v = parseInt(e.target.value, 10);
                if (isNaN(v)) v = 10;
                v = Math.max(4, Math.min(15, v));
                setStampCount(v);
                setFilled(new Set());
              }}
              className="w-24 rounded-lg border px-3 py-2 text-sm font-bold outline-none focus:border-[#A24D2A]"
              style={{ borderColor: "#E7C9A9", background: "#FBF6EA", color: "#2E1B12" }}
            />
          </div>
          <p className="text-xs" style={{ color: "#5F4A3F", maxWidth: 260 }}>
            Defina quantos pedidos até o brinde. A grade se ajusta automaticamente.
          </p>
          <button
            type="button"
            onClick={resetStamps}
            data-testid="reset-stamps"
            className="inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors"
            style={{ borderColor: "#A24D2A", color: "#A24D2A", background: "transparent" }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpar carimbos
          </button>
        </div>
        <p className="mt-3 text-xs" style={{ color: "#5F4A3F" }}>
          Dica: clique nos textos dos cartões para editar. Nos cartões de fidelidade, clique nos círculos para
          simular carimbos.
        </p>
      </div>

      {/* CARTÃO DE AGRADECIMENTO */}
      <section className="mb-14">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-black" style={{ color: "#2E1B12" }}>
            Cartão de Agradecimento
          </h2>
          <button
            type="button"
            data-testid="print-thanks"
            onClick={printThanks}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.02]"
            style={{ background: "#A24D2A" }}
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir folha (4 por A4)
          </button>
        </div>
        <div
          className="mat-stage flex justify-center"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(43,29,20,0.025) 0 2px, transparent 2px 10px), #E7DBBE",
          }}
        >
          <ThanksCard cardRef={thanksRef} profile={profile} style={style} lang={lang} />
        </div>
      </section>

      {/* CARTÃO FIDELIDADE */}
      <section className="mb-14">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-black" style={{ color: "#2E1B12" }}>
            Cartão de Fidelidade
          </h2>
          <button
            type="button"
            data-testid="print-loyalty"
            onClick={printLoyalty}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.02]"
            style={{ background: "#A24D2A" }}
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir folha (4 por A4)
          </button>
        </div>
        <div
          className="mat-stage flex justify-center"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(43,29,20,0.025) 0 2px, transparent 2px 10px), #E7DBBE",
          }}
        >
          <LoyaltyCard
            cardRef={loyaltyRef}
            stamps={stamps}
            filled={filled}
            onToggle={toggle}
            cols={cols}
            stampCount={stampCount}
            profile={profile}
            style={style}
            lang={lang}
          />
        </div>
      </section>
    </div>
  );
}

/* ---------- Cartão Agradecimento ---------- */
function ThanksCard({ cardRef, profile, style, lang }) {
  const palette = style.palette;
  const brandName = (profile.name || "SUA MARCA");
  const brandDisplay = brandName.length > 24 ? brandName : brandName.replace(/\b\w/g, (c) => c.toUpperCase());
  const slogan = profile.slogan || "feito com carinho pra você";
  const message = profile.packageMessage || "Seu pedido foi preparado com muito cuidado, escolhendo cada ingrediente como se fosse pra nossa própria mesa. Que cada mordida traga um sorriso.";
  const instagram = profile.instagram || "@sua_marca";
  const whatsapp = profile.whatsapp ? formatPhone(profile.whatsapp) : "(11) 99999-0000";
  return (
    <div
      ref={cardRef}
      className="thanks-card relative w-[400px] max-w-full px-8 pb-7 pt-9"
      style={{
        background: palette.bg,
        color: palette.ink,
        fontFamily: lang.sansFont,
        boxShadow: "0 10px 26px rgba(43,29,20,0.18)",
        clipPath:
          "polygon(0% 2%,4% 0%,9% 2%,14% 0%,19% 2%,24% 0%,29% 2%,34% 0%,39% 2%,44% 0%,49% 2%,54% 0%,59% 2%,64% 0%,69% 2%,74% 0%,79% 2%,84% 0%,89% 2%,94% 0%,100% 2%,100% 100%,0% 100%)",
      }}
    >
      <div className="mb-1 flex gap-2">
        <Heart className="h-6 w-6" style={{ color: palette.accent, fill: palette.accent }} />
      </div>
      <h3
        className="mat-editable font-black leading-none"
        contentEditable
        suppressContentEditableWarning
        style={{ fontFamily: lang.displayFont, fontSize: 34, color: palette.accent, margin: "6px 0 2px" }}
      >
        Obrigado(a)!
      </h3>
      <p
        className="mat-editable"
        contentEditable
        suppressContentEditableWarning
        style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: palette.inkSoft, margin: "0 0 18px" }}
      >
        {slogan}
      </p>
      <p
        className="mat-editable"
        contentEditable
        suppressContentEditableWarning
        style={{ fontSize: 14.5, lineHeight: 1.55, color: palette.ink, margin: "0 0 22px" }}
      >
        {message}
      </p>
      <p
        className="mat-editable"
        contentEditable
        suppressContentEditableWarning
        style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: palette.ink, margin: "0 0 18px" }}
      >
        Com carinho, {brandDisplay}
      </p>
      <hr className="mb-3 border-none border-t border-dashed" style={{ borderColor: palette.accent + "88" }} />
      <div className="flex justify-between text-[11px] uppercase tracking-wider" style={{ color: palette.inkSoft }}>
        <span>{instagram}</span>
        <span>{whatsapp}</span>
      </div>
    </div>
  );
}

/* ---------- Cartão Fidelidade ---------- */
function LoyaltyCard({ cardRef, stamps, filled, onToggle, cols, stampCount, profile, style, lang }) {
  const palette = style.palette;
  const isDark = style.stage === "noir";
  const bgCard = isDark
    ? "radial-gradient(circle at 85% 15%, rgba(217,164,65,0.20), transparent 55%), " + palette.bg
    : "radial-gradient(circle at 85% 15%, " + palette.accent + "22, transparent 55%), " + palette.ink;
  const inkOnCard = isDark ? palette.ink : palette.bg;
  const accent = palette.accent;
  const brandName = profile.name || "SUA MARCA";
  const brandTitle = brandName.replace(/\b\w/g, (c) => c.toUpperCase());
  const slogan = profile.slogan || "feito com carinho";
  return (
    <div
      ref={cardRef}
      className="loyalty-card relative flex h-[250px] w-[432px] max-w-full flex-col justify-between overflow-hidden rounded-2xl p-6"
      style={{
        background: bgCard,
        color: inkOnCard,
        fontFamily: lang.sansFont,
        boxShadow: "0 10px 26px rgba(43,29,20,0.28)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-[-40px] top-[-40px] h-[150px] w-[150px] rounded-full"
        style={{ background: accent + "1a" }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div
            className="mat-editable font-black"
            contentEditable
            suppressContentEditableWarning
            style={{ fontFamily: lang.displayFont, fontSize: 20, color: accent }}
          >
            {brandTitle}
          </div>
          <div
            className="mat-editable"
            contentEditable
            suppressContentEditableWarning
            style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: inkOnCard, opacity: 0.85, marginTop: -4 }}
          >
            {slogan}
          </div>
        </div>
        <div
          className="mat-editable max-w-[150px] text-right"
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: 11, color: inkOnCard, opacity: 0.9, lineHeight: 1.35 }}
        >
          A cada {stampCount} pedidos, o {stampCount + 1}º é por nossa conta 🎁
        </div>
      </div>

      <div
        className="stamp-grid relative z-10"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, color: accent }}
      >
        {stamps.map((i) => (
          <button
            key={i}
            type="button"
            data-testid={`stamp-${i}`}
            onClick={() => onToggle(i)}
            className={`stamp-slot ${filled.has(i) ? "filled" : ""}`}
            aria-label={`Carimbo ${i + 1}`}
          >
            <Heart className="h-4 w-4" strokeWidth={2.4} />
          </button>
        ))}
      </div>

      <div
        className="relative z-10 flex justify-between text-[10.5px] uppercase tracking-wide"
        style={{ opacity: 0.75 }}
      >
        <span className="mat-editable" contentEditable suppressContentEditableWarning>
          Cliente: ______________
        </span>
        <span className="mat-editable" contentEditable suppressContentEditableWarning>
          válido enquanto durar o programa
        </span>
      </div>
    </div>
  );
}

function formatPhone(digits) {
  const d = (digits || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return d;
}

/* ---------- Impressão em folha A4 (4 por página) ---------- */
function printGrid(kind, copies, htmlProvider) {
  const outer = htmlProvider();
  const grid = new Array(copies).fill(outer).join("");
  const gap = kind === "thanks" ? "12mm" : "8mm";

  const doc = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Imprimir cartões</title>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700;800&family=Caveat:wght@500;700&family=Karla:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #fff; font-family: 'Karla', system-ui, sans-serif; }
      .sheet {
        width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm;
        display: grid; grid-template-columns: repeat(2, 1fr); gap: ${gap};
        justify-items: center; align-content: start;
      }
      .sheet > * { transform: none !important; }
      /* Remove qualquer hover residual */
      button, .stamp-slot { pointer-events: none; }
      /* Neutraliza contentEditable outline em impressão */
      [contenteditable] { background: transparent !important; }
    </style></head><body>
    <div class="sheet">${grid}</div>
    </body></html>`;

  // Blob URL avoids document.write() and keeps XSS analyzers happy. The
  // `outer` content comes from React-rendered outerHTML (already escaped).
  const blob = new Blob([doc], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=900,height=1200");
  if (!w) {
    URL.revokeObjectURL(url);
    return;
  }
  setTimeout(() => {
    try { w.print(); } catch (err) { console.debug("print failed", err); }
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 500);
}
