import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Sparkles, ArrowRight } from "lucide-react";

/**
 * Tela de retorno do Stripe Checkout. Poll do status até o webhook confirmar.
 * Palette: cream + terracotta (alinhada ao restante do app).
 */
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking");
  const attempts = useRef(0);
  const MAX_ATTEMPTS = 10;

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (attempts.current >= MAX_ATTEMPTS) {
        setStatus("timeout");
        return;
      }
      attempts.current += 1;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setStatus("paid");
          return;
        }
        if (data.status === "expired" || data.payment_status === "expired") {
          setStatus("expired");
          return;
        }
        if (data.payment_status === "failed" || data.status === "failed") {
          setStatus("failed");
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        setStatus("error");
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div
      data-testid="payment-success-page"
      className="relative min-h-[calc(100vh-4rem)]"
      style={{ backgroundColor: "#FAF6F0" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(216,154,91,0.35), rgba(216,154,91,0))",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center px-6 py-16">
        <div className="w-full rounded-[28px] border border-[#EED3C3] bg-white/85 p-10 text-center shadow-[0_30px_80px_-30px_rgba(138,63,33,0.35)] backdrop-blur">
          {status === "checking" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin" style={{ color: "#8A3F21" }} />
              <h1 className="mt-6 font-display text-2xl font-bold text-[#2E1B12]">
                Confirmando pagamento…
              </h1>
              <p className="mt-3 text-sm text-[#5F4A3F]">
                Só um instante — estamos liberando seu acesso completo.
              </p>
            </>
          )}
          {status === "paid" && (
            <>
              <div
                className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white shadow-lg"
                style={{ background: "linear-gradient(135deg,#C96A3D 0%,#8A3F21 100%)" }}
              >
                <CheckCircle2 className="h-9 w-9" strokeWidth={2.4} />
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#F4E1D5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8A3F21]">
                <Sparkles className="h-3 w-3" />
                Bem-vinda ao Cozinha Lucrativa
              </div>
              <h1 className="mt-4 font-display text-3xl font-black text-[#2E1B12]">
                Pagamento confirmado!
              </h1>
              <p className="mt-3 text-sm text-[#5F4A3F]">
                Seu acesso de 12 meses está liberado. Para entrar, clique abaixo
                e faça login com o <b>mesmo e-mail</b> usado no pagamento.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  data-testid="go-to-dashboard-btn"
                  onClick={() => login()}
                  className="group rounded-full px-8 py-6 font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_40px_-12px_rgba(138,63,33,0.55)]"
                  style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}
                >
                  Entrar para acessar
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-xs text-[#7D6656]">
                  Use o e-mail do pagamento para liberar o acesso automaticamente.
                </p>
              </div>
            </>
          )}
          {(status === "expired" || status === "failed" || status === "error" || status === "timeout") && (
            <>
              <div
                className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white shadow-lg"
                style={{ backgroundColor: "#B91C1C" }}
              >
                <XCircle className="h-9 w-9" strokeWidth={2.4} />
              </div>
              <h1 className="mt-6 font-display text-2xl font-bold text-[#2E1B12]">
                {status === "expired"
                  ? "Sessão expirada"
                  : status === "failed"
                    ? "Pagamento não aprovado"
                    : status === "timeout"
                      ? "Ainda não recebemos a confirmação"
                      : "Não foi possível confirmar"}
              </h1>
              <p className="mt-3 text-sm text-[#5F4A3F]">
                {status === "timeout"
                  ? "Se o valor foi debitado, a confirmação pode levar mais alguns instantes. Recarregue a página em breve."
                  : "Se o valor foi debitado, entre em contato pelo nosso suporte. Você pode tentar de novo abaixo."}
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  onClick={() => navigate("/")}
                  data-testid="back-to-landing-btn"
                  className="rounded-full px-8 py-5 font-bold uppercase tracking-[0.18em] text-white"
                  style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}
                >
                  Tentar de novo
                </Button>
                <Link
                  to="/"
                  className="text-xs font-semibold uppercase tracking-widest text-[#8A3F21] hover:underline"
                >
                  Voltar ao início
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
