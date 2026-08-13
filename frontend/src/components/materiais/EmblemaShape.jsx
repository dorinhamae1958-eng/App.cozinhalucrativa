import React from "react";
import { LINE_ICONS, LANGUAGES, STYLES } from "./brandTokens";

/**
 * EmblemaShape v2
 * ---------------------------------------------------------------------------
 * Renderiza um emblema em 5 formatos (shield, banner, hex, mono, tag).
 *
 * Cada formato tem uma GEOMETRIA PRÓPRIA e safe-zones definidas para que
 * NENHUM elemento (logo, ringText, brand) invada o espaço de outro.
 * Isso resolve o bug histórico da logo cobrindo o texto de categoria.
 *
 * A LINGUAGEM VISUAL (minimal, boutique, artesanal) altera:
 *   • fonte display
 *   • tratamento da fita/faixa do ringText
 *   • divisores decorativos
 *   • ornamentos discretos
 *
 * Props:
 *   shape, size, style (objeto do brandTokens), lang (objeto do brandTokens),
 *   iconKey, customLogoUrl, ringText, brand, foundedYear, slogan
 */

// ---- helpers -------------------------------------------------------------

const buildIconMarkup = (iconKey, size) => {
  // SECURITY: Only render icons whose key exists in the static LINE_ICONS
  // whitelist. This prevents any injection risk from dangerouslySetInnerHTML
  // even though LINE_ICONS itself is source-controlled.
  const svg = Object.prototype.hasOwnProperty.call(LINE_ICONS, iconKey)
    ? LINE_ICONS[iconKey]
    : "";
  if (!svg) return "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24">${svg}</svg>`;
};

// Ajusta font-size do texto do ringText de acordo com comprimento (evita corte).
const fitFontSize = (base, text) => {
  const len = (text || "").length;
  if (len <= 16) return base;
  if (len <= 22) return base - 0.6;
  if (len <= 30) return base - 1.2;
  return base - 1.8;
};

const fitLetterSpacing = (baseEm, text) => {
  const len = (text || "").length;
  if (len <= 16) return `${baseEm}em`;
  if (len <= 22) return `${Math.max(0.06, baseEm - 0.04)}em`;
  return `${Math.max(0.03, baseEm - 0.08)}em`;
};

// ---- Ornamentos por linguagem -------------------------------------------

function LanguageOrnament({ lang, x, y, accent }) {
  if (lang.ornaments === "none") return null;
  if (lang.ornaments === "deco") {
    // florão minúsculo (losango + duas pétalas)
    return (
      <g transform={`translate(${x} ${y})`} fill={accent}>
        <circle r="1.2" />
        <path d="M -4 0 L 0 -1.2 L 4 0 L 0 1.2 Z" opacity="0.85" />
      </g>
    );
  }
  if (lang.ornaments === "stamp") {
    // pequeno traço grosso de carimbo
    return (
      <rect x={x - 6} y={y - 0.8} width="12" height="1.6" fill={accent} rx="0.4" />
    );
  }
  return null;
}

// ---- renderIcon (logo/ícone) com safe-zone ------------------------------

// x, y = centro da área. size = largura E altura do BOX (contain).
function renderLogo({ customLogoUrl, iconKey, cx, cy, boxSize, palette, uid, showFrame = false }) {
  const s = boxSize;
  const x = cx - s / 2;
  const y = cy - s / 2;

  if (customLogoUrl) {
    // Frame circular sutil por trás da logo — dá acabamento e separa do fundo.
    const clipId = `logo-clip-${uid}`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={s} height={s} rx={s * 0.14} />
          </clipPath>
        </defs>
        {showFrame && (
          <rect
            x={x - 2}
            y={y - 2}
            width={s + 4}
            height={s + 4}
            rx={s * 0.16}
            fill={palette.bg}
            stroke={palette.accent}
            strokeWidth="0.9"
            opacity="0.9"
          />
        )}
        <image
          href={customLogoUrl}
          x={x}
          y={y}
          width={s}
          height={s}
          preserveAspectRatio="xMidYMid meet"
          clipPath={`url(#${clipId})`}
        />
      </g>
    );
  }

  // Ícone SVG padrão (line-art). Renderizamos maior para preencher a área.
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ color: palette.accent }}
      dangerouslySetInnerHTML={{ __html: buildIconMarkup(iconKey, s) }}
    />
  );
}

// -------------------------------------------------------------------------
// Componente principal
// -------------------------------------------------------------------------

export const EmblemaShape = React.forwardRef(function EmblemaShape(
  {
    shape = "shield",
    size = 180,
    style,
    lang,
    iconKey = "bolo",
    customLogoUrl = null,
    ringText = "ARTESANAL · FEITO EM CASA",
    brand = "DELÍCIAS LUCRATIVAS",
    foundedYear = "",
  },
  ref,
) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const palette = style?.palette || STYLES[2].palette;
  const language = lang || LANGUAGES.boutique;
  const w = size;
  const svgStyle = { width: w, height: w * 1.1, filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.16))" };

  const commonUpper = {
    fontFamily: language.sansFont,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
  };

  const displayText = {
    fontFamily: language.displayFont,
    fontWeight: 700,
  };

  // Mini mode: cartelinha pequena — só logo + moldura
  const minimal = size < 110;

  const brandText = (brand || "").toUpperCase();

  // ================= SHIELD =================
  if (shape === "shield") {
    // viewBox 200 x 220
    // Safe zones:
    //   Ringtext ribbon: y 24..44
    //   Logo box: cx 100, cy 100, box 80x80  (y 60..140)   — nunca invade ribbon
    //   Brand arc:  y 180 (base do escudo)
    const shieldPath =
      "M 20 10 H 180 V 120 " +
      "C 180 160, 145 195, 100 210 " +
      "C 55 195, 20 160, 20 120 Z";
    const innerPath =
      "M 28 18 H 172 V 118 " +
      "C 172 156, 140 187, 100 200 " +
      "C 60 187, 28 156, 28 118 Z";
    const brandArc = "M 30 132 Q 100 210 170 132";

    return (
      <svg ref={ref} viewBox="0 0 200 220" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path id={`shield-arc-${uid}`} d={brandArc} fill="none" />
        </defs>

        {/* Base shape */}
        <path d={shieldPath} fill={palette.bg} stroke={palette.ring} strokeWidth="2.2" />
        {language.dividerStyle !== "hairline" ? (
          <path d={innerPath} fill="none" stroke={palette.accent} strokeWidth="1.2" opacity="0.9" />
        ) : (
          <path d={innerPath} fill="none" stroke={palette.accent} strokeWidth="0.7" opacity="0.6" />
        )}

        {/* Ribbon topo com ringText */}
        {!minimal && (
          <>
            {language.ringStyle === "filled" && (
              <>
                <path d="M 6 24 L 194 24 L 200 34 L 194 44 L 6 44 L 0 34 Z" fill={palette.accent} opacity="0.95" />
                <text x="100" y="38" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.6, ringText), fill: "#FFFFFF", letterSpacing: fitLetterSpacing(0.16, ringText) }}>
                  {ringText}
                </text>
              </>
            )}
            {language.ringStyle === "outline" && (
              <>
                <rect x="14" y="24" width="172" height="20" rx="1.5" fill="none" stroke={palette.accent} strokeWidth="1.4" />
                <text x="100" y="38" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.4, ringText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.14, ringText) }}>
                  {ringText}
                </text>
              </>
            )}
            {language.ringStyle === "off" && (
              <text x="100" y="38" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.2, ringText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.22, ringText) }}>
                {ringText}
              </text>
            )}
          </>
        )}

        {/* Divider entre ribbon e logo */}
        {!minimal && language.ringStyle === "off" && (
          <line x1="70" y1="52" x2="130" y2="52" stroke={palette.accent} strokeWidth="0.6" opacity="0.6" />
        )}

        {/* LOGO — safe zone garantida */}
        {renderLogo({ customLogoUrl, iconKey, cx: 100, cy: minimal ? 110 : 100, boxSize: minimal ? 70 : 80, palette, uid, showFrame: !!customLogoUrl })}

        {/* Divider inferior */}
        {!minimal && (
          <g opacity="0.7">
            {language.dividerStyle === "stamp" && (
              <line x1="65" y1="150" x2="135" y2="150" stroke={palette.accent} strokeWidth="1.6" />
            )}
            {language.dividerStyle === "double" && (
              <>
                <line x1="65" y1="150" x2="135" y2="150" stroke={palette.accent} strokeWidth="0.8" />
                <line x1="75" y1="153" x2="125" y2="153" stroke={palette.accent} strokeWidth="0.5" />
              </>
            )}
            {language.dividerStyle === "hairline" && (
              <line x1="80" y1="150" x2="120" y2="150" stroke={palette.accent} strokeWidth="0.6" />
            )}
          </g>
        )}

        {/* Brand em arco */}
        {!minimal && (
          <text style={{ ...commonUpper, fontSize: fitFontSize(6.8, brandText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.16, brandText) }} textAnchor="middle">
            <textPath href={`#shield-arc-${uid}`} startOffset="50%">{brandText}</textPath>
          </text>
        )}

        {/* Ornamento */}
        {!minimal && <LanguageOrnament lang={language} x={100} y={165} accent={palette.accent} />}
      </svg>
    );
  }

  // ================= BANNER =================
  if (shape === "banner") {
    // viewBox 200 x 200
    // Fita HORIZONTAL só no TOPO. Cartão retangular abaixo.
    // Ribbon: y 8..32   Logo: cy 108, box 80    Brand: y 168
    return (
      <svg ref={ref} viewBox="0 0 200 200" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
        {/* Cartão principal */}
        <rect x="20" y="46" width="160" height="140" rx="4" fill={palette.bg} stroke={palette.ring} strokeWidth="2" />
        <rect x="26" y="52" width="148" height="128" rx="2" fill="none" stroke={palette.accent} strokeWidth="0.9" opacity="0.85" />

        {/* Fita atrás do cartão */}
        {!minimal && (
          <>
            {language.ringStyle === "filled" && (
              <>
                <path d="M 6 12 L 194 12 L 200 24 L 194 36 L 6 36 L 0 24 Z" fill={palette.accent} opacity="0.95" />
                <path d="M 0 24 L 6 12 L 6 24 Z M 200 24 L 194 12 L 194 24 Z" fill={palette.ring} opacity="0.4" />
                <text x="100" y="28" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(8, ringText), fill: "#FFFFFF", letterSpacing: fitLetterSpacing(0.14, ringText) }}>{ringText}</text>
              </>
            )}
            {language.ringStyle === "outline" && (
              <>
                <rect x="12" y="12" width="176" height="22" rx="2" fill="none" stroke={palette.accent} strokeWidth="1.4" />
                <text x="100" y="27" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.6, ringText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.14, ringText) }}>{ringText}</text>
              </>
            )}
            {language.ringStyle === "off" && (
              <text x="100" y="28" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.4, ringText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.22, ringText) }}>{ringText}</text>
            )}
          </>
        )}

        {/* LOGO */}
        {renderLogo({ customLogoUrl, iconKey, cx: 100, cy: minimal ? 118 : 100, boxSize: minimal ? 76 : 82, palette, uid, showFrame: !!customLogoUrl })}

        {!minimal && (
          <>
            {/* Divider */}
            <line x1="60" y1="150" x2="140" y2="150" stroke={palette.accent} strokeWidth="0.7" opacity="0.7" />
            {/* Brand */}
            <text x="100" y="166" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.6, brandText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.16, brandText) }}>{brandText}</text>
            {foundedYear ? (
              <text x="100" y="177" textAnchor="middle" style={{ ...commonUpper, fontSize: 6, fill: palette.inkSoft, letterSpacing: "0.3em" }}>{`DESDE ${foundedYear}`}</text>
            ) : null}
          </>
        )}
      </svg>
    );
  }

  // ================= HEX =================
  if (shape === "hex") {
    // Hexágono horizontal ("selo aduaneiro"). viewBox 200 x 200.
    // 6 pontos: (30,60),(100,20),(170,60),(170,140),(100,180),(30,140)
    const hexPts = "30,60 100,20 170,60 170,140 100,180 30,140";
    const innerHex = "40,66 100,32 160,66 160,134 100,168 40,134";

    return (
      <svg ref={ref} viewBox="0 0 200 200" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
        <polygon points={hexPts} fill={palette.bg} stroke={palette.ring} strokeWidth="2.2" />
        <polygon points={innerHex} fill="none" stroke={palette.accent} strokeWidth={language.dividerStyle === "hairline" ? "0.6" : "1.1"} opacity="0.85" />

        {/* Ringtext: em ARCO no topo do hex (não fita, respeita hex) */}
        {!minimal && (
          <>
            <defs>
              <path id={`hex-arc-top-${uid}`} d="M 34 62 Q 100 44 166 62" fill="none" />
              <path id={`hex-arc-bot-${uid}`} d="M 34 138 Q 100 172 166 138" fill="none" />
            </defs>
            <text style={{ ...commonUpper, fontSize: fitFontSize(7.4, ringText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.18, ringText) }} textAnchor="middle">
              <textPath href={`#hex-arc-top-${uid}`} startOffset="50%">{ringText}</textPath>
            </text>
          </>
        )}

        {/* LOGO — centrado no hex */}
        {renderLogo({ customLogoUrl, iconKey, cx: 100, cy: 100, boxSize: minimal ? 66 : 78, palette, uid, showFrame: !!customLogoUrl })}

        {!minimal && (
          <>
            <text style={{ ...commonUpper, fontSize: fitFontSize(7, brandText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.18, brandText) }} textAnchor="middle">
              <textPath href={`#hex-arc-bot-${uid}`} startOffset="50%">{brandText}</textPath>
            </text>
          </>
        )}
      </svg>
    );
  }

  // ================= MONOGRAMA =================
  if (shape === "mono") {
    // Retângulo vertical clean. Logo GRANDE domina o centro.
    // viewBox 180 x 220.
    // Zonas: brand (topo, y 26)  |  logo (cy 118, box 120)  |  ringText (y 190)
    const brandSmallCaps = brandText;

    return (
      <svg ref={ref} viewBox="0 0 180 220" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="12" width="156" height="196" rx={language.corner === "rounded" ? 10 : 4} fill={palette.bg} stroke={palette.ring} strokeWidth="1.8" />
        <rect x="18" y="18" width="144" height="184" rx={language.corner === "rounded" ? 8 : 2} fill="none" stroke={palette.accent} strokeWidth="0.7" opacity="0.7" />

        {!minimal && (
          <>
            {/* Brand no topo (small caps) */}
            <line x1="32" y1="34" x2="70" y2="34" stroke={palette.accent} strokeWidth="0.7" />
            <line x1="110" y1="34" x2="148" y2="34" stroke={palette.accent} strokeWidth="0.7" />
            <text x="90" y="37" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7, brandSmallCaps), fill: palette.accent, letterSpacing: fitLetterSpacing(0.18, brandSmallCaps) }}>{brandSmallCaps}</text>
          </>
        )}

        {/* LOGO grande */}
        {renderLogo({ customLogoUrl, iconKey, cx: 90, cy: minimal ? 118 : 118, boxSize: minimal ? 76 : 110, palette, uid, showFrame: !!customLogoUrl })}

        {!minimal && (
          <>
            <line x1="40" y1="180" x2="140" y2="180" stroke={palette.ring} strokeWidth="0.7" opacity="0.6" />
            <text x="90" y="194" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.2, ringText), fill: palette.ink, letterSpacing: fitLetterSpacing(0.14, ringText) }}>{ringText}</text>
            <LanguageOrnament lang={language} x={90} y={204} accent={palette.accent} />
          </>
        )}
      </svg>
    );
  }

  // ================= ETIQUETA (TAG) =================
  if (shape === "tag") {
    // Etiqueta clássica pendurada, orientação retrato. viewBox 180 x 220.
    // Furo no topo; cordinha em vetor. Ringtext em fita horizontal
    // sob o furo, logo abaixo, brand ao fim.
    const tagBody =
      "M 90 30 L 140 45 L 160 65 L 160 200 L 20 200 L 20 65 L 40 45 Z";
    return (
      <svg ref={ref} viewBox="0 0 180 220" style={svgStyle} xmlns="http://www.w3.org/2000/svg">
        {/* Cordão */}
        <path d="M 76 8 Q 90 -2 104 8" fill="none" stroke={palette.ring} strokeWidth="1.2" opacity="0.75" />
        <path d="M 88 8 L 88 30 M 92 8 L 92 30" stroke={palette.ring} strokeWidth="0.8" opacity="0.4" />

        {/* Corpo da tag */}
        <path d={tagBody} fill={palette.bg} stroke={palette.ring} strokeWidth="2.2" />
        <path d="M 90 38 L 134 51 L 152 68 L 152 194 L 28 194 L 28 68 L 46 51 Z" fill="none" stroke={palette.accent} strokeWidth="0.9" opacity="0.85" />

        {/* Furo */}
        <circle cx="90" cy="30" r="6" fill={palette.bg} stroke={palette.ring} strokeWidth="1.4" />
        <circle cx="90" cy="30" r="3.4" fill={palette.ring} opacity="0.18" />

        {/* Ringtext */}
        {!minimal && (
          <>
            {language.ringStyle === "filled" ? (
              <>
                <rect x="30" y="72" width="120" height="18" rx="1.6" fill={palette.accent} opacity="0.95" />
                <text x="90" y="84.5" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.4, ringText), fill: "#FFFFFF", letterSpacing: fitLetterSpacing(0.14, ringText) }}>{ringText}</text>
              </>
            ) : language.ringStyle === "outline" ? (
              <>
                <rect x="34" y="72" width="112" height="18" rx="1.6" fill="none" stroke={palette.accent} strokeWidth="1.2" />
                <text x="90" y="85" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.2, ringText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.14, ringText) }}>{ringText}</text>
              </>
            ) : (
              <text x="90" y="86" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.2, ringText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.22, ringText) }}>{ringText}</text>
            )}
          </>
        )}

        {/* LOGO */}
        {renderLogo({ customLogoUrl, iconKey, cx: 90, cy: minimal ? 130 : 132, boxSize: minimal ? 72 : 80, palette, uid, showFrame: !!customLogoUrl })}

        {!minimal && (
          <>
            <line x1="50" y1="180" x2="130" y2="180" stroke={palette.accent} strokeWidth="0.7" opacity="0.7" />
            <text x="90" y="192" textAnchor="middle" style={{ ...commonUpper, fontSize: fitFontSize(7.2, brandText), fill: palette.accent, letterSpacing: fitLetterSpacing(0.14, brandText) }}>{brandText}</text>
          </>
        )}
      </svg>
    );
  }

  return null;
});

export default EmblemaShape;
