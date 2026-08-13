// Device fingerprint helpers for anti-account-sharing.
// Persists a random device_id in localStorage and produces a human-friendly device name.
const KEY = "cl_device_id";

export function getDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id =
        (window.crypto?.randomUUID?.() ||
          `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage disabled → fallback per-tab id
    return `no-storage-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getDeviceName() {
  if (typeof window === "undefined") return "Dispositivo";
  const ua = navigator.userAgent || "";
  const p = navigator.platform || "";
  // OS
  let os = "Desconhecido";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac/i.test(ua) || /Mac/i.test(p)) os = "Mac";
  else if (/Windows/i.test(ua) || /Win/i.test(p)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";
  // Browser
  let browser = "Navegador";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  return `${os} · ${browser}`;
}

export function clearDeviceId() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
