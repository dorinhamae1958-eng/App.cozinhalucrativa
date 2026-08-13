import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { NAV_GROUPS } from "@/lib/nav-groups";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  GraduationCap,
  Calculator,
  Store,
  Loader2,
  BookOpen,
  NotebookPen,
  HelpCircle,
  Package,
  Trophy,
  Palette,
  ShoppingBag,
  Gift,
  ChevronDown,
} from "lucide-react";

// Ícone lucide por rota — substitui os emojis dos itens dos pilares.
const ITEM_ICONS = {
  "/meus-cursos": BookOpen,
  "/minhas-anotacoes": NotebookPen,
  "/plantao": HelpCircle,
  "/calculadora": Calculator,
  "/encomendas": Package,
  "/jornada": Trophy,
  "/materiais": Palette,
  "/minha-vitrine": ShoppingBag,
  "/bonus-extra": Gift,
};

// ---------- Configuração comercial única ----------
const PRICE_TOTAL = 57;
const PRICE_INSTALLMENTS = 12;
const PRICE_INSTALLMENT_VALUE = 5.70; // 12x de R$ 5,70
const STRIPE_LOOKUP_KEY = "cozinha_lucrativa_57";

// Ícone visual do topo de cada card — reforça a "capitânia" da coluna
const PILLAR_ICONS = {
  aprender: GraduationCap,
  vender: Calculator,
  marca: Store,
};

// 10 oportunidades. Card em 2 camadas: fechado mostra só a oportunidade;
// ao expandir, mostra investimento, preço e um cenário de faturamento BRUTO
// (preço de referência × volume semanal × ~4 semanas). Nada de promessa.
const COURSES = [
  { slug: "bolos-caseiros",      label: "Bolos Caseiros",              subtitle: "Produção simples para quem quer começar pequeno e trabalhar com encomendas.", idealFor: "Quem quer começar produzindo em casa",              investment: "R$ 150–400", price: "≈ R$ 35 / bolo",      objective: "R$ 1.680–2.240", objectivePeriod: "/mês",          volume: "12–16 bolos por semana",              tags: ["Encomendas", "Venda direta", "WhatsApp", "Datas comemorativas"], image: "/images/bolo-caseiro.jpg" },
  { slug: "iogurtes-gourmet",    label: "Iogurtes Gourmet",            subtitle: "Consumo frequente e baixo investimento para vender no dia a dia.",            idealFor: "Quem quer vender no dia a dia com baixo custo",     investment: "R$ 120–300", price: "≈ R$ 10 / pote",      objective: "R$ 1.600–2.400", objectivePeriod: "/mês",          volume: "40–60 potes por semana",              tags: ["Venda direta", "Delivery", "WhatsApp", "Vizinhança"], image: "/images/iogurtes-gourmet.png" },
  { slug: "brigadeiro-gourmet",  label: "Brigadeiro Gourmet",          subtitle: "Baixo investimento e ótima aceitação, ideal para encomendas.",                idealFor: "Quem quer começar com pouco e vender por encomenda", investment: "R$ 100–300", price: "≈ R$ 3,50 / unidade", objective: "R$ 1.610–2.100", objectivePeriod: "/mês",          volume: "115–150 unidades por semana",         tags: ["Encomendas", "Caixas & kits", "Festas", "WhatsApp"], image: "/images/brigadeiro-gourmet.png" },
  { slug: "geladinhos-gourmet",  label: "Geladinhos Gourmet",          subtitle: "Grande procura em períodos quentes e baixo custo para começar.",              idealFor: "Quem quer começar com pouca grana",                 investment: "R$ 80–200",  price: "≈ R$ 5 / unidade",    objective: "R$ 1.600–2.400", objectivePeriod: "/mês",          volume: "80–120 unidades por semana",          tags: ["Venda direta", "Vizinhança", "WhatsApp", "Verão"], image: "/images/geladinho.jpg" },
  { slug: "plr-pascoa",          label: "Ovos & Chocolates de Páscoa", subtitle: "Uma temporada capaz de concentrar boa parte do faturamento do ano.",          idealFor: "Quem quer aproveitar datas comemorativas",          investment: "R$ 250–600", price: "≈ R$ 70 / ovo",       objective: "R$ 1.610–2.240", objectivePeriod: " por temporada", volume: "23–32 ovos na temporada",             seasonal: true, tags: ["Encomendas", "Datas comemorativas", "WhatsApp", "Instagram"], image: "/images/ovo-pascoa.jpg" },
  { slug: "receitas-kids",       label: "Lanches Kids",                subtitle: "Ideal para escolas, aniversários e festas.",                                  idealFor: "Quem atende festas, escolas e eventos",             investment: "R$ 150–350", price: "≈ R$ 12 / lanche",    objective: "R$ 1.632–2.400", objectivePeriod: "/mês",          volume: "34–50 lanches por semana",            tags: ["Festas", "Escolas", "Encomendas", "WhatsApp"], image: "/images/alimento-saudavel.png" },
  { slug: "receitas-lactose",    label: "Confeitaria Sem Lactose",     subtitle: "Atenda um público que busca opções específicas e diferenciadas.",             idealFor: "Quem quer começar com produtos de nicho",           investment: "R$ 200–500", price: "≈ R$ 15 / porção",    objective: "R$ 1.620–2.400", objectivePeriod: "/mês",          volume: "27–40 porções por semana",            tags: ["Nicho específico", "Encomendas", "WhatsApp", "Instagram"], image: "/images/sem-lactose.png" },
  { slug: "receitas-zero-gluten",label: "Confeitaria Sem Glúten",      subtitle: "Especialização que gera diferenciação e fidelização.",                        idealFor: "Quem quer atender público celíaco e sensível ao glúten", investment: "R$ 250–600", price: "≈ R$ 17 / porção", objective: "≈ R$ 1.630–2.180", objectivePeriod: "/mês",       volume: "24–32 porções por semana",            tags: ["Nicho específico", "Encomendas", "WhatsApp", "Instagram"], image: "/images/sem-gluten.jpg" },
  { slug: "receitas-low-carb",   label: "Receitas Low Carb",           subtitle: "Mercado fitness em crescimento e ticket mais elevado.",                       idealFor: "Quem quer atender o público fitness e saudável",    investment: "R$ 150–300", price: "≈ R$ 15 / porção",    objective: "R$ 1.620–2.400", objectivePeriod: "/mês",          volume: "27–40 porções por semana",            tags: ["Público fitness", "Delivery", "WhatsApp", "Instagram"], image: "/images/receitas-low-carb.webp" },
  { slug: "receitas-diabeticos", label: "Doces Sem Açúcar",            subtitle: "Produtos para um público que busca alimentação equilibrada.",                 idealFor: "Quem quer atender público diabético e diet",        investment: "R$ 200–500", price: "≈ R$ 10 / porção",    objective: "R$ 1.600–2.400", objectivePeriod: "/mês",          volume: "40–60 porções por semana",            tags: ["Nicho específico", "Encomendas", "WhatsApp", "Instagram"], image: "/images/doces-sem-acucar.webp" },
];

const SECTION_LABEL_CLS =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-[#A05330]";

// Card de oportunidade em 2 camadas (fechado -> expandido inline).
function OpportunityCard({ c }) {
  const [open, setOpen] = useState(false);
  return (
    <article
      data-testid={`product-${c.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-[#EED3C3] bg-white shadow-[0_2px_20px_-10px_rgba(138,63,33,0.2)] transition-all duration-300 hover:-translate-y-1 hover:border-[#D8A98F] hover:shadow-[0_28px_60px_-24px_rgba(138,63,33,0.4)]"
    >
      {/* Camada 1: imagem grande */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={c.image}
          alt={c.label}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {/* Camada 1: nome + descrição + ideal para */}
        <h3 className="font-display text-2xl font-black leading-tight text-[#2E1B12]">
          {c.label}
        </h3>
        <p
          data-testid={`product-subtitle-${c.slug}`}
          className="mt-2 text-sm leading-relaxed text-[#5F4A3F]"
        >
          {c.subtitle}
        </p>
        <div className="mt-4">
          <p className={SECTION_LABEL_CLS}>Ideal para</p>
          <p
            data-testid={`product-ideal-${c.slug}`}
            className="mt-1 text-sm font-semibold text-[#3A271C]"
          >
            {c.idealFor}
          </p>
        </div>

        {/* Camada 2: painel expansível (CSS grid rows, sem dependência) */}
        <div
          className={`grid transition-[grid-template-rows] duration-500 ease-out ${
            open ? "mt-5 grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div
              data-testid={`product-details-${c.slug}`}
              aria-hidden={!open}
              className="space-y-5 border-t border-[#EED3C3]/80 pt-5"
            >
              {/* Como pode começar */}
              <div>
                <p className={SECTION_LABEL_CLS}>Como pode começar</p>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#8A7568]">Investimento inicial</p>
                    <p
                      data-testid={`product-investment-${c.slug}`}
                      className="mt-0.5 text-base font-bold text-[#2E1B12]"
                    >
                      {c.investment}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A7568]">Preço de referência</p>
                    <p
                      data-testid={`product-price-${c.slug}`}
                      className="mt-0.5 text-base font-bold text-[#2E1B12]"
                    >
                      {c.price}
                    </p>
                  </div>
                </div>
              </div>

              {/* Um primeiro objetivo possível */}
              <div className="rounded-2xl bg-[#F6E7DC]/70 px-4 py-3">
                <p className={SECTION_LABEL_CLS}>
                  {c.seasonal
                    ? "Exemplo de simulação (temporada)"
                    : "Exemplo de simulação"}
                </p>
                <p
                  data-testid={`product-objective-${c.slug}`}
                  className="mt-1 font-display text-lg font-black text-[#2E1B12]"
                >
                  {c.objective}
                  {c.objectivePeriod}*
                </p>
                <p className="mt-1 text-[11px] text-[#8A7568]">
                  Base de vendas:{" "}
                  <span data-testid={`product-volume-${c.slug}`} className="font-semibold text-[#5F4A3F]">
                    {c.volume}
                  </span>
                  .
                </p>
              </div>

              {/* O que pode explorar */}
              <div>
                <p className={SECTION_LABEL_CLS}>O que pode explorar</p>
                <p
                  data-testid={`product-tags-${c.slug}`}
                  className="mt-1 text-sm text-[#5F4A3F]"
                >
                  {c.tags.join(" · ")}
                </p>
              </div>

              {/* Ressalva */}
              <p className="text-[11px] leading-relaxed text-[#8A7568]">
                *Estimativa de faturamento bruto. Não representa lucro nem promessa
                de resultado. O resultado depende de preço, demanda, custos,
                frequência de produção e capacidade de venda.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de expandir/ocultar */}
        <button
          type="button"
          data-testid={`product-toggle-${c.slug}`}
          aria-expanded={open}
          aria-controls={`product-details-${c.slug}`}
          onClick={() => setOpen((v) => !v)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#D8A98F] bg-white px-5 py-2.5 text-sm font-bold text-[#8A3F21] transition-colors hover:bg-[#F6E7DC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C96A3D]/50 sm:w-auto sm:self-start"
        >
          {open ? "Ocultar detalhes" : "Ver quanto precisa para começar"}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            strokeWidth={2.4}
          />
        </button>
      </div>
    </article>
  );
}

const CHECKLIST = [
  "10 possibilidades de renda + 2 conteúdos bônus",
  "Passo a passo em vídeo para aprender a fazer",
  "Calculadora de Lucro por produto",
  "Vitrine profissional com link único",
  "Painel de encomendas e clientes",
  "Caderno de anotações com IA",
  "Kit de marketing e scripts de WhatsApp",
  "Acesso liberado por 12 meses sem mensalidade",
];

function formatBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useCheckout() {
  const [loading, setLoading] = useState(false);
  const start = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        lookup_key: STRIPE_LOOKUP_KEY,
        origin_url: window.location.origin,
      });
      if (!data?.checkout_url) throw new Error("checkout_url ausente");
      window.location.assign(data.checkout_url);
    } catch (err) {
      setLoading(false);
      const msg =
        err?.response?.data?.detail ||
        "Não conseguimos abrir o pagamento agora. Tente novamente em instantes.";
      toast.error(msg);
    }
  };
  return { start, loading };
}

function CTAButton({ testId, size = "md", start, loading, label = "Quero começar" }) {
  const sizeCls =
    size === "lg"
      ? "px-5 py-6 text-sm sm:px-10 sm:py-7 sm:text-base"
      : size === "sm"
        ? "px-6 py-4 text-xs"
        : "px-8 py-6 text-sm";
  return (
    <Button
      data-testid={testId}
      onClick={start}
      disabled={loading}
      className={`group rounded-full font-bold uppercase tracking-[0.18em] text-white shadow-[0_12px_40px_rgba(217,119,6,0.45)] transition-all hover:shadow-[0_18px_60px_rgba(217,119,6,0.65)] disabled:cursor-progress disabled:opacity-90 ${sizeCls}`}
      style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Abrindo pagamento…
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </>
      )}
    </Button>
  );
}

function PriceBlock({ testId }) {
  return (
    <div data-testid={testId} className="mt-6 flex flex-wrap items-baseline gap-3">
      <span className="font-display text-5xl font-black text-[#2E1B12] sm:text-6xl">
        {formatBRL(PRICE_TOTAL)}
      </span>
      <span className="text-sm font-semibold uppercase tracking-widest text-[#5F4A3F]">
        pagamento único
      </span>
      <span className="w-full text-sm text-[#5F4A3F]">
        <strong>12 meses de acesso ao app</strong>. ou {PRICE_INSTALLMENTS}x de {formatBRL(PRICE_INSTALLMENT_VALUE)} sem juros
      </span>
    </div>
  );
}

export default function Landing() {
  const { start, loading } = useCheckout();

  // Pré-carrega config Stripe (útil para diagnósticos e para “aquecer” a rota).
  useEffect(() => {
    api.get("/payments/config").catch(() => {});
  }, []);

  // Se o usuário voltou de um checkout cancelado, mostra um aviso amistoso.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "cancelled") {
      toast("Pagamento cancelado. Quando quiser, é só clicar em Quero começar.", {
        icon: "🍰",
      });
      params.delete("payment");
      const clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", clean);
    }
  }, []);

  const quickChecks = useMemo(
    () => ["Acesso imediato", "12 meses de acesso", "Pagamento único", "Sem renovação automática"],
    []
  );

  return (
    <div data-testid="landing-page" className="text-[#2E1B12]" style={{ backgroundColor: "#FAF6F0" }}>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        {/* Camada de imagem */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: 'url("/images/hero.png")',
            backgroundSize: "cover",
            backgroundPosition: "center right",
          }}
        />
        {/* Overlay creme para o texto ficar legível */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(250,246,240,0.97) 0%, rgba(250,246,240,0.92) 40%, rgba(250,246,240,0.55) 65%, rgba(250,246,240,0.15) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-24 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(216,154,91,0.45), rgba(216,154,91,0))",
          }}
        />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 py-16 md:py-24 lg:px-12 lg:py-32">
          <div className="max-w-2xl">
            <h1
              className="font-display text-4xl leading-[1.05] text-[#2E1B12] sm:text-5xl lg:text-6xl"
              data-testid="hero-title"
            >
              Descubra o que vender e{" "}
              <span
                className="italic"
                style={{
                  background: "linear-gradient(135deg,#C96A3D 0%,#8A3F21 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                por onde começar
              </span>{" "}
              a sua renda com comida.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4A3529] sm:text-lg">
              O aplicativo que te mostra <strong>o que dá pra vender</strong>,{" "}
              <strong>quanto precisa para começar</strong> e por onde dar os
              primeiros passos, sem ter que descobrir tudo sozinha.
            </p>

            <PriceBlock testId="hero-price" />

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <CTAButton testId="hero-cta" size="lg" start={start} loading={loading} label="Quero acessar o app" />
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#4A3529]">
              {quickChecks.map((c) => (
                <li key={c} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: "#8A3F21" }} strokeWidth={2.6} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- 10 CAMINHOS DE RENDA ---------- */}
      <section className="overflow-hidden border-y border-[#EED3C3]/70 bg-[#F4E1D5]/40">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-12 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8A3F21]">
              não sabe por onde começar?
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-[#2E1B12] sm:text-4xl">
              Descubra o que dá pra vender e o que combina com você.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5F4A3F]">
              O problema quase nunca é falta de vontade. É não saber o que
              vender, quanto cobrar e por onde começar. Aqui você compara as
              possibilidades e escolhe a sua com calma.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5F4A3F]">
              Toque em cada possibilidade para ver quanto precisa para começar e
              um exemplo de simulação. Depois é só aprender o passo a passo dentro
              do app.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {COURSES.map((c) => (
              <OpportunityCard key={c.slug} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 3 PILARES ---------- */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8A3F21]">
          não é só um curso
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-[#2E1B12] sm:text-4xl">
          Um app que te ajuda a descobrir o que vender e a aprender como fazer.
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {NAV_GROUPS.map((group) => {
            const Icon = PILLAR_ICONS[group.id];
            return (
              <div
                key={group.id}
                data-testid={`pillar-${group.id}`}
                className="group relative flex flex-col overflow-hidden rounded-[28px] border border-[#EAD3C4] bg-gradient-to-b from-white to-[#FCF6F1] p-7 shadow-[0_2px_20px_-8px_rgba(138,63,33,0.18)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D8A98F] hover:shadow-[0_28px_60px_-24px_rgba(138,63,33,0.45)]"
              >
                {/* Faixa de destaque no topo do card */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: "linear-gradient(90deg,#C96A3D 0%,#8A3F21 100%)" }}
                />

                {/* Cabeçalho do card — ícone + label do menu + subtitle */}
                <div className="flex items-start gap-3.5">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_24px_-8px_rgba(138,63,33,0.6)] ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#C96A3D 0%,#8A3F21 100%)" }}
                    aria-hidden
                  >
                    {Icon ? <Icon className="h-5 w-5" strokeWidth={2.2} /> : null}
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A05330]">
                      {group.subtitle}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-black text-[#2E1B12]">
                      {group.label}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#5F4A3F]">
                  {group.tagline}
                </p>

                <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[#E7CBB9] to-transparent" />

                {/* Lista de itens — ícone lucide + label + description */}
                <ul className="mt-6 space-y-2">
                  {group.items.map((it) => {
                    const ItemIcon = ITEM_ICONS[it.to];
                    return (
                      <li
                        key={it.to}
                        data-testid={`pillar-${group.id}-item-${it.testId}`}
                        className="flex items-start gap-3.5 rounded-2xl p-2 transition-colors duration-200 hover:bg-[#F6E7DC]"
                      >
                        <span
                          aria-hidden
                          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#EAD3C4] bg-white text-[#A24D2A] shadow-sm transition-colors duration-200 group-hover:border-[#E0BBA3]"
                        >
                          {ItemIcon ? <ItemIcon className="h-[18px] w-[18px]" strokeWidth={2} /> : null}
                        </span>
                        <div className="leading-snug">
                          <p className="text-[13px] font-bold text-[#2E1B12]">{it.label}</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-[#6B5347]">
                            {it.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- CHECKLIST + CTA FINAL ---------- */}
      <section className="mx-auto max-w-4xl px-6 py-20 lg:py-28">
        <div className="rounded-[32px] border border-[#EED3C3] bg-white/85 p-8 shadow-[0_30px_80px_-30px_rgba(138,63,33,0.35)] backdrop-blur sm:p-12">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.28em] text-[#8A3F21]">
            tudo incluso · sem mensalidade
          </p>
          <h2 className="mt-3 text-center font-display text-3xl leading-tight text-[#2E1B12] sm:text-4xl">
            12 meses de acesso ao app por{" "}
            <span
              className="italic"
              style={{
                background: "linear-gradient(135deg,#C96A3D 0%,#8A3F21 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {formatBRL(PRICE_TOTAL)}
            </span>
            .
          </h2>

          <ul className="mx-auto mt-8 grid max-w-2xl gap-x-8 gap-y-3 sm:grid-cols-2">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[#2E1B12]">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
                  style={{ backgroundColor: "#8A3F21" }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5F4A3F]">
              pagamento único · 12 meses de acesso · ou 12x de {formatBRL(PRICE_INSTALLMENT_VALUE)}
            </p>
            <CTAButton testId="footer-cta" size="lg" start={start} loading={loading} />
            <p className="text-[11px] text-[#5F4A3F]">
              Acesso por 12 meses · sem renovação automática
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
