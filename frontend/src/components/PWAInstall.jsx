import React, { useEffect, useState, useCallback } from "react";
import { Download, X, Share, Plus, ChefHat } from "lucide-react";

/**
 * PWAInstall — banner/CTA para instalar o app na tela inicial.
 * - Android/Chrome/Edge: usa o evento `beforeinstallprompt` nativo.
 * - iOS/Safari: mostra instruções "Compartilhar → Adicionar à Tela de Início".
 * Não altera nenhuma lógica de negócio; é apenas a camada de instalação PWA.
 */
const DISMISS_KEY = "cl_pwa_install_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ finge ser Mac; detecta pelo touch
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

export default function PWAInstall() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // já instalado
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const iosDevice = isIOS();
    setIos(iosDevice);

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {}
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS não dispara beforeinstallprompt — mostra o banner com instruções.
    if (iosDevice) setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setShowIosSheet(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }, []);

  const handleInstall = useCallback(async () => {
    if (ios) {
      setShowIosSheet(true);
      return;
    }
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {}
    setDeferred(null);
    setVisible(false);
  }, [deferred, ios]);

  if (!visible) return null;

  return (
    <>
      {/* Banner fixo inferior (mobile-first) */}
      <div
        data-testid="pwa-install-banner"
        className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#EED3C3] bg-white/95 p-3 shadow-[0_20px_60px_-20px_rgba(138,63,33,0.5)] backdrop-blur-xl">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md"
            style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
          >
            <ChefHat className="h-6 w-6" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-[#2E1B12]">
              Instalar aplicativo
            </p>
            <p className="truncate text-xs text-[#5F4A3F]">
              Adicione à tela inicial e abra como um app.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            data-testid="pwa-install-button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#C96A3D 0%,#8A3F21 100%)" }}
          >
            <Download className="h-4 w-4" strokeWidth={2.6} />
            Instalar
          </button>
          <button
            type="button"
            onClick={dismiss}
            data-testid="pwa-install-dismiss"
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1.5 text-[#8A3F21] transition-colors hover:bg-[#F4E1D5]"
          >
            <X className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {/* Instruções iOS (Safari não tem prompt nativo) */}
      {showIosSheet && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm"
          onClick={dismiss}
          data-testid="pwa-ios-sheet"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#EED3C3] bg-[#FAF6F0] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-xl font-black text-[#2E1B12]">
                Instalar no iPhone
              </p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-[#8A3F21] hover:bg-[#F4E1D5]"
              >
                <X className="h-5 w-5" strokeWidth={2.6} />
              </button>
            </div>
            <ol className="space-y-4 text-sm text-[#4A3529]">
              <li className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F4E1D5] font-bold text-[#8A3F21]">1</span>
                <span className="flex flex-wrap items-center gap-1">
                  Toque no botão <Share className="inline h-4 w-4 text-[#8A3F21]" /> <b>Compartilhar</b> do Safari.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F4E1D5] font-bold text-[#8A3F21]">2</span>
                <span className="flex flex-wrap items-center gap-1">
                  Escolha <Plus className="inline h-4 w-4 text-[#8A3F21]" /> <b>Adicionar à Tela de Início</b>.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F4E1D5] font-bold text-[#8A3F21]">3</span>
                <span>Confirme em <b>Adicionar</b>. Pronto! 🎉</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
