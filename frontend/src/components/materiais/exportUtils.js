// Converte um SVG do DOM em PNG e dispara download.
// Estratégia: XMLSerializer → data URL → <img> → canvas.drawImage → toBlob('image/png')
// Renderiza em alta resolução (default 3x) para impressão nítida.

export async function downloadSvgAsPng(svgEl, filename = "emblema.png", scale = 3) {
  if (!svgEl) throw new Error("SVG element não encontrado");

  // Clona para poder alterar sem tocar no DOM real
  const clone = svgEl.cloneNode(true);

  // Garante xmlns
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!clone.getAttribute("xmlns:xlink")) {
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }

  // Descobre dimensões do viewBox e tamanho renderizado
  const vb = (clone.getAttribute("viewBox") || "0 0 200 200").split(/\s+/).map(Number);
  const vbW = vb[2] || 200;
  const vbH = vb[3] || 200;
  const rect = svgEl.getBoundingClientRect();
  const baseW = rect.width || vbW;
  const baseH = rect.height || vbH;

  // Fixa width/height explícitos no clone para o navegador rasterizar corretamente
  clone.setAttribute("width", String(baseW));
  clone.setAttribute("height", String(baseH));

  // Inclui as fontes web já carregadas na página (para não perder a tipografia).
  // Como o cross-origin de fontes é chato, embutimos um @import mínimo.
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700;800&family=Playfair+Display:wght@700;800&family=Cormorant+Garamond:wght@700&family=Sora:wght@600;700&family=Fredoka:wght@600;700&family=Karla:wght@600;700&family=Caveat:wght@500;700&display=swap');
    text { font-family: Karla, system-ui, sans-serif; }
  `;
  clone.insertBefore(styleEl, clone.firstChild);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(svgUrl);

    const outW = Math.round(baseW * scale);
    const outH = Math.round(baseH * scale);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    // Fundo transparente por padrão (PNG). Se quisesse branco: ctx.fillRect(...)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    triggerDownload(blob, filename);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function triggerDownload(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Lê um File como dataURL (uso: upload de logo personalizada)
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
