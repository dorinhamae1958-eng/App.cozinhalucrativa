// Small HTML-escape helper used when we must inject user-controlled strings
// (brand name, Instagram handle, product text) into templates rendered via
// `window.open(...).document.write(...)` for printing.
//
// This prevents XSS when a user's own brand profile contains HTML/script
// characters. Keep it dependency-free and framework-agnostic.

const ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str.replace(/[&<>"'`]/g, (ch) => ENTITIES[ch] || ch);
}

// Tagged-template helper: `esc\`<h1>${title}</h1>\`` auto-escapes interpolations.
export function esc(strings, ...values) {
  let out = "";
  strings.forEach((chunk, i) => {
    out += chunk;
    if (i < values.length) out += escapeHtml(values[i]);
  });
  return out;
}
