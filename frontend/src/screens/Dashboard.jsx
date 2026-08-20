import React, { useEffect, useMemo, useState } from "react";
import { api, BRL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Lock, ArrowRight, Loader2, ShoppingCart, Clock, Layers, Sparkles, Star,
} from "lucide-react";

/* ============================================================
 * Catálogo de Cursos — /meus-cursos
 * Organizado em 3 categorias comerciais + destaque de recomendados.
 * ============================================================ */

const CATEGORIES = [
  {
    id: "vendas-diarias",
    icon: "💰",
    title: "Vendas Diárias",
    subtitle: "Produtos com alta recorrência e baixo investimento.",
    accent: "#F5B98A",
    courses: [
      {
        slug: "bolos-caseiros",
        emoji: "🍰",
        display: "Bolos Caseiros",
        headline: "Produção diária, excelente margem e clientes recorrentes.",
        offers: [
          "20+ receitas: chocolate, leite ninho, fubá, brigadeiro e mais",
          "Receita base do zero + utensílios essenciais",
          "Apostila oficial + guias de massas e recheios",
          "Páginas de vendas prontas (modelos Elementor)",
        ],
      },
      {
        slug: "iogurtes-gourmet",
        emoji: "🥛",
        display: "Iogurtes Gourmet",
        headline: "Consumo frequente, baixo investimento e público fiel.",
        offers: [
          "Iogurte grego, natural e gourmet de Ninho com Nutella",
          "Caldas: morango, maracujá, coco, paçoca e versões diet",
          "Extras vendedores: Danete, Danoninho e sorvete de Ninho",
          "Apostila do iogurte caseiro + logo da marca",
        ],
      },
      {
        slug: "brigadeiro-gourmet",
        emoji: "🍫",
        display: "Brigadeiro Gourmet",
        headline: "Baixo custo, alto valor agregado e ótima aceitação.",
        offers: [
          "Masterclass em vídeo + e-book completo",
          "10 módulos: do ponto perfeito aos sabores campeões",
          "Recheios, coberturas e embalagem premium",
          "Precificação, fotografia e estratégia de encomendas",
        ],
      },
      {
        slug: "marmita-fitness",
        emoji: "🥗",
        display: "Marmitas Fitness",
        headline: "Marmitas congeladas de alta procura e renda recorrente toda semana.",
        offers: [
          "Bases da semana: carne, frango, arroz integral, legumes e feijão",
          "Marmitas de frango, carne e peixe + panquecas fit",
          "Higiene, embalagem e conservação de congelados",
          "Bônus: sanduíche natural + apostila oficial",
        ],
      },
    ],
  },
  {
    id: "encomendas-eventos",
    icon: "📦",
    title: "Encomendas & Eventos",
    subtitle: "Produtos que aumentam o ticket médio.",
    accent: "#E1B392",
    courses: [
      {
        slug: "geladinhos-gourmet",
        emoji: "🍧",
        display: "Geladinhos Gourmet",
        headline: "Grande procura no verão e excelente margem.",
        offers: [
          "Liga base + 30 sabores: açaí, bis, brigadeiro, prestígio, Kit Kat",
          "Mousses (limão e maracujá) e Romeu e Julieta",
          "Versões alcoólicas: caipirinha e vodka com morango",
          "Apostila + páginas de venda e criativos prontos",
        ],
      },
      {
        slug: "plr-pascoa",
        emoji: "🎂",
        display: "Ovos & Chocolates de Páscoa",
        headline: "Uma temporada capaz de gerar meses de faturamento.",
        offers: [
          "Ovos tradicionais, de colher, de corte e bombons",
          "Cascas: crocante, de ouro, cravejada e pronta",
          "Recheios: Ninho com morango, Ferrero, mousse e Oreo",
          "Precificação, divulgação e onde comprar os insumos",
        ],
      },
      {
        slug: "receitas-kids",
        emoji: "🧁",
        display: "Lanches Kids",
        headline: "Ideal para escolas, aniversários e festas.",
        offers: [
          "Receitas: brigadeiro, cookies, cupcake e bolinho de cacau",
          "Passo a passo em vídeo: ingredientes, preparo e montagem",
          "PDFs das receitas para consulta rápida",
          "Página de vendas pronta para festas e escolas",
        ],
      },
    ],
  },
  {
    id: "nichos-premium",
    icon: "🌿",
    title: "Nichos Premium",
    subtitle: "Mercados que cobram mais e enfrentam menos concorrência.",
    accent: "#B8D4A8",
    courses: [
      {
        slug: "receitas-lactose",
        emoji: "🥛",
        display: "Confeitaria Sem Lactose",
        headline: "Atenda um público disposto a pagar mais.",
        offers: [
          "Substituições seguras e testadas",
          "Bolos, doces e sobremesas sem lactose",
          "Rotulagem correta para nicho premium",
          "Estratégia de posicionamento e fidelização",
        ],
      },
      {
        slug: "receitas-zero-gluten",
        emoji: "🌾",
        display: "Confeitaria Sem Glúten",
        headline: "Especialização que gera diferenciação e fidelização.",
        offers: [
          "Pães, bolos e massas que não desandam",
          "Blends de farinhas e técnicas profissionais",
          "Manejo de contaminação cruzada",
          "Comunicação certificada para celíacos",
        ],
      },
      {
        slug: "receitas-low-carb",
        emoji: "🥑",
        display: "Receitas Low Carb",
        headline: "Mercado fitness em crescimento e ticket elevado.",
        offers: [
          "Barrinhas, pães, brigadeiros e sobremesas",
          "Cálculo de macros e informação nutricional",
          "Bônus: receitas fit para almoço e janta",
          "Roteiro de vendas para academias e nutris",
        ],
      },
      {
        slug: "receitas-diabeticos",
        emoji: "🍬",
        display: "Doces Sem Açúcar",
        headline: "Ideal para diabéticos e consumidores que buscam alimentação equilibrada.",
        offers: [
          "Uso seguro de adoçantes e substitutos",
          "Receitas de baixo índice glicêmico",
          "Portfólio completo para consultórios",
          "Precificação de nicho premium",
        ],
      },
    ],
  },
];

const RECOMMENDED_SLUGS = [
  "bolos-caseiros",
  "brigadeiro-gourmet",
  "iogurtes-gourmet",
  "geladinhos-gourmet",
  "receitas-kids",
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coursesMap, setCoursesMap] = useState({});
  const [enrolledSlugs, setEnrolledSlugs] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/courses"),
      api.get("/enrollments").catch(() => ({ data: [] })),
    ])
      .then(([c, e]) => {
        const map = {};
        for (const it of c.data || []) map[it.slug] = it;
        setCoursesMap(map);
        setEnrolledSlugs(new Set((e.data || []).map((x) => x.course_slug)));
      })
      .finally(() => setLoading(false));
  }, []);

  const allCategoryCourses = useMemo(
    () => CATEGORIES.flatMap((c) => c.courses),
    []
  );
  const purchasedCount = allCategoryCourses.filter((c) =>
    enrolledSlugs.has(c.slug)
  ).length;

  return (
    <div
      data-testid="dashboard-page"
      className="mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-20"
    >
      <div className="mb-12">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] font-semibold text-amber-500">
          bem-vinda, {user?.name?.split(" ")[0] || "aluna"}
        </p>
        <h1 className="font-display text-4xl font-black leading-tight text-stone-50 sm:text-5xl">
          Catálogo de Cursos
        </h1>
        <p className="mt-3 max-w-2xl text-base text-stone-400">
          {purchasedCount > 0
            ? `Você tem acesso a ${purchasedCount} ${
                purchasedCount === 1 ? "curso" : "cursos"
              }. Continue de onde parou e explore novas oportunidades.`
            : "Descubra o que cada curso oferece e escolha por onde começar sua jornada."}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          {CATEGORIES.map((cat, catIdx) => (
            <CategorySection
              key={cat.id}
              category={cat}
              coursesMap={coursesMap}
              enrolledSlugs={enrolledSlugs}
              navigate={navigate}
              index={catIdx}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* ============================== RECOMENDADOS ============================== */
function RecommendedStrip({ coursesMap, enrolledSlugs, navigate }) {
  const items = RECOMMENDED_SLUGS.map((slug) => {
    for (const cat of CATEGORIES) {
      const found = cat.courses.find((c) => c.slug === slug);
      if (found) return found;
    }
    return null;
  }).filter(Boolean);

  return (
    <section
      data-testid="recommended-strip"
      className="mb-16 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-900/20 via-stone-900 to-stone-950 p-6 md:p-8"
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
          <Star className="h-3 w-3" strokeWidth={2.5} />
          recomendado para começar hoje
        </span>
        <h2 className="font-display text-2xl font-black text-stone-50 md:text-3xl">
          Se fosse escolher <span className="italic text-amber-400">apenas 5</span>,
          começaria por estes.
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it, i) => {
          const c = coursesMap[it.slug];
          const purchased = enrolledSlugs.has(it.slug);
          return (
            <button
              key={it.slug}
              type="button"
              data-testid={`recommended-${it.slug}`}
              onClick={() =>
                purchased
                  ? navigate(`/curso/${it.slug}/modulos`)
                  : navigate(`/planos?curso=${it.slug}`)
              }
              className="group relative overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/60 text-left transition-all animate-fade-in-up hover:-translate-y-1 hover:border-amber-500/50"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {c?.cover_image && (
                  <img
                    src={c.cover_image}
                    alt={it.display}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                <span
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-lg shadow-md"
                  style={{ background: "rgba(244,225,213,0.95)" }}
                  aria-hidden
                >
                  {it.emoji}
                </span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold leading-tight text-stone-50">
                  {it.display}
                </h3>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============================== CATEGORIA ============================== */
function CategorySection({ category, coursesMap, enrolledSlugs, navigate, index }) {
  return (
    <section
      data-testid={`category-${category.id}`}
      className="mb-16"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {category.icon}
            </span>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: category.accent }}
            >
              categoria
            </p>
          </div>
          <h2
            data-testid={`category-title-${category.id}`}
            className="font-display text-3xl font-black leading-tight text-stone-50 md:text-4xl"
          >
            {category.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-stone-400">{category.subtitle}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {category.courses.map((entry, i) => {
          const c = coursesMap[entry.slug];
          if (!c) return null;
          return (
            <CourseCard
              key={entry.slug}
              entry={entry}
              course={c}
              purchased={enrolledSlugs.has(entry.slug)}
              index={i}
              onEnter={() => navigate(`/curso/${entry.slug}/modulos`)}
              onBuy={() => navigate(`/planos?curso=${entry.slug}`)}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ============================== CARD ============================== */
function CourseCard({ entry, course, purchased, index, onEnter, onBuy }) {
  const modulesCount = Array.isArray(course.combined_from)
    ? course.combined_from.length
    : course.modules?.length || 0;

  return (
    <article
      data-testid={`catalog-card-${entry.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 animate-fade-in-up ${
        purchased
          ? "border-amber-500/30 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 hover:border-amber-500/60 hover:shadow-[0_0_40px_rgba(217,119,6,0.2)]"
          : "border-stone-800 bg-stone-900 hover:border-stone-700"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Cover */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={course.cover_image}
          alt={course.title}
          className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div
          className={`absolute inset-0 ${
            purchased
              ? "bg-gradient-to-t from-stone-950/80 via-transparent to-transparent"
              : "bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/30"
          }`}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-2xl font-black leading-tight text-stone-50">
          {entry.display}
        </h3>

        <div className="mt-1 flex items-center gap-4 text-xs text-stone-500">
          {course.duration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {course.duration}
            </span>
          )}
          {modulesCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> {modulesCount} módulos
            </span>
          )}
        </div>

        <div className="my-2 h-px w-full bg-gradient-to-r from-transparent via-stone-800 to-transparent" />

        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/90">
          o que este curso oferece
        </p>
        <ul className="space-y-1.5">
          {entry.offers.map((o) => (
            <li
              key={o}
              className="flex items-start gap-2 text-[13px] leading-snug text-stone-300"
            >
              <Sparkles
                className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500"
                strokeWidth={2.4}
              />
              <span>{o}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-5">
          {purchased ? (
            <Button
              data-testid={`enter-course-${entry.slug}`}
              onClick={onEnter}
              className="group/btn w-full rounded-full bg-amber-600 py-6 text-base font-semibold text-stone-950 shadow-[0_0_20px_rgba(217,119,6,0.25)] hover:bg-amber-700"
            >
              Entrar no Curso
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          ) : (
            <div className="space-y-2">
              <div
                data-testid={`in-package-${entry.slug}`}
                className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-center"
              >
                <Sparkles className="h-3.5 w-3.5 flex-none text-amber-400" strokeWidth={2.4} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  incluído no pacote completo
                </span>
              </div>
              <Button
                data-testid={`preview-course-${entry.slug}`}
                onClick={onEnter}
                variant="ghost"
                className="w-full rounded-full border border-amber-500/40 bg-transparent py-6 text-base font-semibold text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
              >
                Conhecer Curso
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
