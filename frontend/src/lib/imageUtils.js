// Client-side image utils: compress uploaded image to a small base64 data URL.
export async function fileToCompressedDataURL(file, {
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.72,
} = {}) {
  if (!file) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return await readAsDataURL(file);

  let { width, height } = bitmap;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Build wa.me url with pre-filled message
export function waLink(phone, message) {
  const p = String(phone || "").replace(/\D/g, "");
  const msg = encodeURIComponent(message || "");
  return `https://wa.me/${p}?text=${msg}`;
}
