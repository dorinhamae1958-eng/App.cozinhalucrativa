import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChefHat } from "lucide-react";

/**
 * Entrar — capa enxuta que antecede o consentimento Google.
 * Cartão único, centralizado e responsivo (mobile-first).
 */
export default function Entrar() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [ticking, setTicking] = useState(false);

  // Se já está logada, manda direto para a área de aluna
  useEffect(() => {
    if (!loading && user) navigate("/meus-cursos", { replace: true });
  }, [loading, user, navigate]);

  const nextUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/meus-cursos`;
  }, []);

  const handleContinue = () => {
    setTicking(true);
    setTimeout(() => login(), 260);
  };

  return (
    <div
      data-testid="entrar-page"
      className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden px-5 py-10"
      style={{ backgroundColor: "#FAF6F0" }}
    >
      {/* Textura decorativa: círculos suaves de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(216,154,91,0.35), rgba(216,154,91,0))",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(162,77,42,0.28), rgba(162,77,42,0))",
        }}
      />

      {/* Cartão único */}
      <section
        data-testid="entrar-card"
        className="relative z-10 w-full max-w-md rounded-[28px] border border-[#EED3C3] bg-white/85 p-7 text-center shadow-[0_30px_80px_-30px_rgba(138,63,33,0.35)] backdrop-blur-xl sm:p-10"
      >
        <div
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-md"
          style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
        >
          <ChefHat className="h-7 w-7" strokeWidth={2.5} />
        </div>

        <p
          className="mt-5 font-display text-2xl font-black text-[#2E1B12] sm:text-3xl"
          data-testid="entrar-title"
        >
          Cozinha Lucrativa
        </p>
        <h2 className="mt-3 font-display text-xl text-[#2E1B12] sm:text-2xl">
          Bem-vinda de volta.
        </h2>
        <p className="mt-2 text-sm text-[#5F4A3F] sm:text-base">
          Entre para continuar de onde parou.
        </p>

        <button
          type="button"
          onClick={handleContinue}
          disabled={ticking}
          data-testid="entrar-continuar-google"
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-base font-bold text-[#2E1B12] shadow-[0_14px_40px_-12px_rgba(138,63,33,0.35)] ring-1 ring-[#EED3C3] transition-all hover:shadow-[0_18px_50px_-12px_rgba(138,63,33,0.5)] disabled:cursor-progress disabled:opacity-80"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          {ticking ? "Entrando…" : "Continuar com Google"}
        </button>

        <p className="mt-4 text-xs text-[#5F4A3F]" data-testid="entrar-redirect-hint" title={nextUrl}>
          Login seguro com sua conta Google.
        </p>
      </section>
    </div>
  );
}
