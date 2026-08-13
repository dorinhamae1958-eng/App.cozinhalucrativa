// Utilidades para tratamento da logo enviada pela usuária.
// - autoCropLogo: detecta o bounding-box do conteúdo opaco na imagem
//   (alpha > threshold) e recorta o "espaço vazio" ao redor. Isso permite
//   que logos com muito fundo transparente aproveitem 100% da área útil
//   dos emblemas, sem ficarem minúsculas.

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Recorta o "vazio transparente" ao redor de uma imagem, retornando um
 * novo dataURL PNG cortado no bounding-box do conteúdo. Adiciona uma
 * margem de segurança configurável (padding).
 *
 * Estratégia:
 *   1. Desenha em canvas
 *   2. Varre pixels (alpha > alphaThreshold) para achar minX/minY/maxX/maxY
 *   3. Se detectou área menor que 90% da original: recorta
 *   4. Também padroniza para uma proporção quadrada (o menor lado
 *      determina o outro), centralizando, para caber melhor em
 *      containers circulares/quadrados dos emblemas.
 */
export async function autoCropLogo(dataUrl, { alphaThreshold = 12, padding = 0.05 } = {}) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    // Cross-origin ou security error — devolve original
    return dataUrl;
  }
  const { data, width, height } = imageData;

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback: imagem totalmente opaca ou totalmente transparente
  if (maxX < 0 || (maxX - minX + 1) / width > 0.92) {
    return dataUrl;
  }

  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;

  // Padroniza em quadrado (lado = max(bboxW, bboxH)) e centraliza,
  // depois aplica padding proporcional.
  const side = Math.max(bboxW, bboxH);
  const pad = Math.round(side * padding);
  const outSide = side + pad * 2;
  const centerX = minX + bboxW / 2;
  const centerY = minY + bboxH / 2;
  const cropX = Math.max(0, Math.round(centerX - outSide / 2));
  const cropY = Math.max(0, Math.round(centerY - outSide / 2));
  const cropW = Math.min(outSide, width - cropX);
  const cropH = Math.min(outSide, height - cropY);

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  try {
    return out.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}
