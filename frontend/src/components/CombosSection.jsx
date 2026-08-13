import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Clock, Layers } from "lucide-react";

/**
 * CombosSection — apresenta os 3 modelos de negócio da plataforma.
 * Não vende cursos individuais: cada card é uma vitrine do modelo,
 * com CTA único "Conhecer Curso". A conversão acontece no bloco
 * "Acesso Total" (PremiumAccessHero) na Landing.
 */
export default function CombosSection() {
  const navigate = useNavigate();
  const [combos, setCombos] = useState([]);
  const [courses, setCourses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/courses").then((r) => {
      const map = {};
      for (const c of r.data || []) map[c.slug] = c;
      setCourses(map);
      const combined = (r.data || []).filter(
        (c) => Array.isArray(c.combined_from) && c.combined_from.length > 0,
      );
      const ORDER = ["delicias-lucrativas", "confeitaria-alta-demanda", "confeitaria-fitness"];
      combined.sort((a, b) => {
        const ia = ORDER.indexOf(a.slug);
        const ib = ORDER.indexOf(b.slug);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      setCombos(combined);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <section
      id="combos"
      data-testid="combos-section"
      className="mx-auto max-w-7xl px-6 pt-24 md:px-12 lg:pt-32"
    >
      <div className="mb-10 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/[0.06] px-4 py-1.5">
          <Layers className="h-3.5 w-3.5 text-amber-400" />
          <span
            data-testid="combos-eyebrow"
            className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400"
          >
            3 Modelos de Negócio · 9 Especialidades
          </span>
        </div>
        <h2
          data-testid="combos-title"
          className="font-display text-3xl font-black leading-tight text-stone-50 sm:text-4xl lg:text-5xl"
        >
          9 Especialidades para você construir <span className="italic text-amber-400">novas fontes de renda.</span>
        </h2>
        <p
          data-testid="combos-subtitle"
          className="mt-4 text-base text-stone-400 md:text-lg"
        >
          Escolha por onde começar ou tenha acesso imediato a toda a plataforma.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[280px] animate-pulse rounded-2xl bg-stone-900" />
          ))}
        </div>
      ) : (
        <div data-testid="combos-grid" className="space-y-6">
          {combos.map((combo, i) => (
            <ComboCard
              key={combo.slug}
              combo={combo}
              subCourses={combo.combined_from
                .map((slug) => courses[slug])
                .filter(Boolean)}
              index={i}
              onDetail={() => navigate(`/curso/${combo.slug}`)}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-stone-500">
        Cada modelo agrupa 3 especialidades complementares · Acesso 12 meses · Certificado incluído
      </p>
    </section>
  );
}

function ComboCard({ combo, subCourses, index, onDetail }) {
  return (
    <div
      data-testid={`combo-card-${combo.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-stone-800/80 bg-stone-900/60 transition-all animate-fade-in-up hover:border-amber-500/40 hover:shadow-[0_20px_60px_rgba(217,119,6,0.15)]"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500/25 via-amber-400/10 to-transparent blur-3xl opacity-70" />

      <div className="relative grid grid-cols-1 items-start gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)] lg:gap-10">
        {/* LEFT: apresentação do modelo */}
        <div className="flex flex-col">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
              Modelo de Negócio
            </span>
          </div>

          <h3 className="font-display text-3xl font-black leading-tight text-stone-50 sm:text-4xl">
            {combo.title}
          </h3>
          <p className="mt-3 text-base leading-relaxed text-stone-300">
            {combo.tagline}
          </p>

          {/* Especialidades incluídas (lista) */}
          <ul className="mt-5 space-y-1.5">
            {subCourses.map((sc) => (
              <li
                key={sc.slug}
                className="flex items-start gap-2 text-sm text-stone-200"
                data-testid={`combo-speciality-${sc.slug}`}
              >
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
                <span className="leading-snug">{sc.title}</span>
              </li>
            ))}
          </ul>

          {/* Tempo de acesso */}
          <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-300">
              Acesso 12 meses
            </span>
          </div>

          {/* CTA único secundário */}
          <div className="mt-6">
            <Button
              onClick={onDetail}
              data-testid={`combo-detail-${combo.slug}`}
              variant="ghost"
              className="h-12 rounded-full border border-stone-700 bg-stone-950/60 px-6 text-sm font-semibold text-stone-100 hover:bg-stone-800 hover:text-amber-300"
            >
              Conhecer Curso
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* RIGHT: 3 especialidades — miniaturas */}
        <div className="grid grid-cols-3 gap-3 self-start pt-2 sm:gap-4 lg:pt-10">
          {subCourses.map((sc) => (
            <div
              key={sc.slug}
              data-testid={`combo-modalidade-${sc.slug}`}
              className="group/mod flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60 transition-all group-hover/mod:-translate-y-1 group-hover/mod:border-amber-500/40 group-hover/mod:shadow-lg group-hover/mod:shadow-amber-500/10">
                <img
                  src={sc.cover_image}
                  alt={sc.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/mod:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="mt-2.5 text-center font-display text-xs font-bold leading-tight text-stone-100 sm:text-sm">
                {sc.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
