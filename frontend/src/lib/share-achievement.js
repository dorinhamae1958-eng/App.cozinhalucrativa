import { toPng } from "html-to-image";

// Renders a hidden 9:16 (1080×1920) DOM node into a PNG Blob.
// The caller is responsible for mounting/unmounting the source node.
export async function nodeToPngBlob(node, opts = {}) {
  const { width = 1080, height = 1920, pixelRatio = 2 } = opts;
  const dataUrl = await toPng(node, {
    width, height, pixelRatio,
    cacheBust: true,
    backgroundColor: "#0c0a09", // stone-950 fallback in case of transparency
    // preserve emoji + display fonts
    style: { transform: "none" },
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

// Downloads a blob to the user's device with the given filename.
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Best-effort native share (uses Web Share API on mobile with file support),
// fallback: downloads the file AND opens a WhatsApp intent with the caption.
export async function shareBlobOrFallback(blob, { filename, caption, title }) {
  const file = new File([blob], filename, { type: "image/png" });
  const data = { files: [file], text: caption, title };
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [file] }) &&
    navigator.share
  ) {
    try {
      await navigator.share(data);
      return { shared: true };
    } catch (e) {
      // user cancelled or share failed — fall through to download
      if (e?.name === "AbortError") return { shared: false, cancelled: true };
    }
  }
  downloadBlob(blob, filename);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(caption)}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");
  return { shared: false };
}
