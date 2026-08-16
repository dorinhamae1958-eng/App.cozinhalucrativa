import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, BRL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getRef } from "@/lib/affiliate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check, Loader2, Sparkles, ArrowRight, ChefHat, ShieldCheck, Clock,
  QrCode, CreditCard, BadgePercent, Ticket,
} from "lucide-react";
import { toast } from "sonner";

const PRICE = 57;
const LOOKUP_KEY = "cozinha_lucrativa_57";

const FEATURES = [
  "Acesso a todos os 10 cursos (todas as modalidades)",
  "Calculadora de preço e lucro ilimitada",
  "Vitrine pública para vender sob encomenda",
  "Controle de encomendas e clientes",
  "Caderno de anotações e jornada de missões",
  "Kit de marketing (rótulos, cartões, scripts de WhatsApp)",
  "Plantão de dúvidas e certificados",
  "Acesso liberado por 12 meses",
];

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());

export default function Plans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payingMp, setPayingMp] = useState(false);
  const [payingStripe, setPayingStripe] = useState(false);
  const [email, setEmail] = useState("");
  const [ref] = useState(() => getRef());
  const [accessCode, setAccessCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);

  useEffect(() => {
    if (user && user.has_access) navigate("/meus-cursos", { replace: true });
    if (user?.email) setEmail(user.email);
  }, [user, navigate]);

  const handleApplyCode = async () => {
    const code = accessCode.trim();
    if (!code) { toast.error("Digite o código de acesso."); return; }
    if (!isValidEmail(email)) { toast.error("Informe um e-mail válido para liberar seu acesso."); return; }
    setApplyingCode(true);
    try {
      const { data } = await api.post("/access-codes/validate", { code, base_price: PRICE });
      if (!data.valid) {
        const msg = {
          not_found: "Código inválido.",
          expired: "Este código expirou.",
          exhausted: "Este código atingiu o limite de usos.",
          inactive: "Código inativo.",
        }[data.reason] || "Código inválido.";
        toast.error(msg);
        return;
      }
      if (!data.free) {
        toast.error("Este é um cupom de desconto parcial. Finalize pelo checkout.");
        return;
      }
      await api.post("/access-codes/redeem", { code, email: email.trim().toLowerCase() });
      toast.success("Acesso liberado! Faça login para entrar.");
      navigate("/payment/success?granted=1");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Não foi possível aplicar o código.");
    } finally {
      setApplyingCode(false);
    }
  };

  const handleMercadoPago = async () => {
    if (!isValidEmail(email)) {
      toast.error("Informe um e-mail válido para liberar seu acesso.");
      return;
    }
    setPayingMp(true);
    try {
      const { data } = await api.post("/payments/mercadopago/preference", {
        email: email.trim().toLowerCase(),
        ref: ref || undefined,
      });
      if (!data.init_point) throw new Error("no init_point");
      window.location.href = data.init_point;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao iniciar pagamento no Mercado Pago.");
      setPayingMp(false);
    }
  };

  const handleStripe = async () => {
    setPayingStripe(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        lookup_key: LOOKUP_KEY,
        quantity: 1,
        origin_url: window.location.origin,
        ref: ref || undefined,
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao iniciar pagamento.");
      setPayingStripe(false);
    }
  };

  return (
    <div
      data-testid="plans-page"
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden"
      style={{ backgroundColor: "#FAF6F0" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(216,154,91,0.35), rgba(216,154,91,0))" }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#EED3C3] bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8A3F21] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Assinatura Cozinha Lucrativa
          </div>
          <h1 className="font-display text-4xl leading-tight text-[#2E1B12] sm:text-5xl">
            Um único pagamento.{" "}
            <span
              className="italic"
              style={{
                background: "linear-gradient(135deg,#C96A3D 0%,#8A3F21 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Acesso completo.
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5F4A3F]">
            Libere todos os cursos e ferramentas por 12 meses e transforme suas
            receitas em uma renda de verdade.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
          {/* Card de preço */}
          <div className="relative flex flex-col rounded-[28px] border border-[#EED3C3] bg-white/85 p-8 shadow-[0_30px_80px_-30px_rgba(138,63,33,0.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-md"
                style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
              >
                <ChefHat className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="leading-tight">
                <p className="font-display text-lg font-black text-[#2E1B12]">Acesso Completo</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8A3F21]">
                  pagamento único · 12 meses
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-end gap-2">
              <span className="font-display text-6xl font-black text-[#8A3F21]">{BRL(PRICE)}</span>
              <span className="mb-2 text-sm text-[#7D6656]">à vista</span>
            </div>
            <p className="mt-1 text-xs text-[#7D6656]">PIX ou cartão de crédito (parcelado)</p>

            {ref && (
              <div
                data-testid="affiliate-badge"
                className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-[#F0E6D2] px-3 py-1 text-[11px] font-bold text-[#6B4B12]"
              >
                <BadgePercent className="h-3.5 w-3.5" /> Indicação aplicada: {ref}
              </div>
            )}

            {/* E-mail para liberar acesso */}
            <div className="mt-6">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A3F21]">
                E-mail para liberar o acesso
              </label>
              <Input
                data-testid="checkout-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="h-12 rounded-xl border-[#EED3C3] bg-white text-[#2E1B12]"
              />
              <p className="mt-1.5 text-[11px] text-[#7D6656]">
                Use o mesmo e-mail para entrar com o Google depois.
              </p>
            </div>

            {/* Mercado Pago — principal */}
            <Button
              data-testid="checkout-mp-btn"
              disabled={payingMp || payingStripe}
              onClick={handleMercadoPago}
              className="group mt-5 w-full rounded-full px-8 py-6 text-base font-bold uppercase tracking-[0.14em] text-white shadow-[0_14px_40px_-12px_rgba(0,120,200,0.55)]"
              style={{ background: "linear-gradient(135deg,#00A8E0,#0068C9)" }}
            >
              {payingMp ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando…</>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" /> Pagar com Mercado Pago
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] font-semibold text-[#0068C9]">
              PIX na hora · cartão de crédito · Mercado Pago
            </p>

            {/* Stripe — secundário */}
            <button
              data-testid="checkout-stripe-btn"
              disabled={payingMp || payingStripe}
              onClick={handleStripe}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#EED3C3] bg-white px-6 py-3.5 text-sm font-bold text-[#8A3F21] transition-colors hover:bg-[#F4E1D5] disabled:opacity-60"
            >
              {payingStripe ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Redirecionando…</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pagar com cartão (Stripe)</>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-4 text-[11px] font-semibold text-[#5F4A3F]">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#8A3F21]" /> Pagamento seguro</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#8A3F21]" /> 12 meses de acesso</span>
            </div>

            {/* Código de acesso social (100% off) */}
            <div className="mt-6 rounded-2xl border border-dashed border-[#EED3C3] bg-[#FBF3EA] p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A3F21]">
                <Ticket className="h-3.5 w-3.5" /> Tenho um código de acesso
              </p>
              <div className="flex gap-2">
                <Input
                  data-testid="access-code-input"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Ex: VIP100"
                  className="h-11 rounded-xl border-[#EED3C3] bg-white font-mono text-[#2E1B12]"
                />
                <Button
                  data-testid="apply-code-btn"
                  onClick={handleApplyCode}
                  disabled={applyingCode || payingMp || payingStripe}
                  className="h-11 shrink-0 rounded-xl px-5 font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#7A3E9D,#5B2E76)" }}
                >
                  {applyingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-[#7D6656]">
                Códigos VIP liberam o acesso sem pagamento. Use o e-mail acima.
              </p>
            </div>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-[#7D6656]">
              Após pagar, entre com o Google usando o <b>mesmo e-mail</b> do
              checkout e seu acesso é liberado automaticamente.
            </p>
          </div>

          {/* Lista de benefícios */}
          <div className="flex flex-col rounded-[28px] border border-[#EED3C3] bg-[#F4E1D5]/40 p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8A3F21]">
              o que está incluído
            </p>
            <ul className="mt-5 space-y-3.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[#4A3529]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#8A3F21] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
