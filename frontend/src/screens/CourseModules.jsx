import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Loader2, PlayCircle, Layers, BookOpen, Clock,
} from "lucide-react";

/**
 * Página intermediária: mostra os 3 módulos (sub-cursos) de um combo.
 * Rota: /curso/:slug/modulos
 *
 * Ao clicar em um módulo, abre a página existente do módulo (/player/:sub-slug).
 * Cada módulo herda o mesmo acesso do combo (garantido via /enrollments/ensure-combo).
 */
export default function CourseModules() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [combo, setCombo] = useState(null);
  const [subCourses, setSubCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1) Combo course
        const c = await api.get(`/courses/${slug}`);
        const comboData = c.data;
        if (!comboData || !Array.isArray(comboData.combined_from) || !comboData.combined_from.length) {
          // Not a combo — redirect straight to player
          navigate(`/player/${slug}`, { replace: true });
          return;
        }
        setCombo(comboData);

        // 2) Ensure enrollment cascade (creates sub-enrollments if missing)
        try {
          await api.post(`/enrollments/ensure-combo/${slug}`);
        } catch (e) {
          if (e.response?.status === 403) {
            setAccessError(true);
            setLoading(false);
            return;
          }
          // silently continue on other errors — BETA_MODE já cria enrollments no login
        }

        // 3) Load each sub-course metadata
        const subs = await Promise.all(
          comboData.combined_from.map((sub) =>
            api.get(`/courses/${sub}`).then((r) => r.data).catch(() => null)
          )
        );
        setSubCourses(subs.filter(Boolean));
      } catch (e) {
        toast.error("Não foi possível carregar o curso.");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-black text-stone-50">
          Este curso ainda não faz parte da sua conta.
        </h1>
        <p className="mt-3 text-stone-400">
          Adquira o acesso para desbloquear todos os módulos.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/meus-cursos">
            <Button
              variant="ghost"
              className="rounded-full border border-stone-800 bg-stone-900 px-6 py-5 text-stone-200 hover:bg-stone-800"
            >
              Voltar ao catálogo
            </Button>
          </Link>
          <Link to={`/planos?curso=${slug}`}>
            <Button
              data-testid="modules-buy-btn"
              className="rounded-full bg-amber-600 px-6 py-5 font-semibold text-stone-950 hover:bg-amber-700"
            >
              Comprar Curso
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!combo) return null;

  return (
    <div data-testid="course-modules-page">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-stone-800">
        <div className="absolute inset-0">
          <img src={combo.cover_image} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/80 to-stone-950/40" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
          <Link
            data-testid="back-to-catalog"
            to="/meus-cursos"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-stone-400 hover:text-amber-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> catálogo
          </Link>
          <h1
            data-testid="modules-course-title"
            className="mt-5 font-display text-4xl font-black leading-tight text-stone-50 sm:text-5xl lg:text-6xl"
          >
            {combo.title}
          </h1>
          {combo.tagline && (
            <p className="mt-3 max-w-2xl text-lg text-stone-300">{combo.tagline}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-stone-400">
            <span className="inline-flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" /> {subCourses.length} módulos
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> {combo.duration}
            </span>
          </div>
        </div>
      </section>

      {/* MODULES GRID */}
      <section className="mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-20">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] font-semibold text-amber-500">
          escolha um módulo
        </p>
        <h2 className="mb-8 font-display text-3xl font-black text-stone-50">
          Módulos do curso
        </h2>

        <div
          data-testid="modules-grid"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {subCourses.map((s, i) => (
            <ModuleCard
              key={s.slug}
              sub={s}
              index={i}
              onOpen={() => navigate(`/player/${s.slug}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ sub, index, onOpen }) {
  const lessonsCount = (sub.modules || []).reduce(
    (n, m) => n + (m.lessons || []).length, 0
  );

  return (
    <article
      data-testid={`module-card-${sub.slug}`}
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-900 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-[0_0_40px_rgba(217,119,6,0.15)] animate-fade-in-up"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={sub.cover_image}
          alt={sub.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
        <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-stone-950/80 px-3 py-1 backdrop-blur-md">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-200">
            Módulo {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-xl font-black leading-tight text-stone-50 transition-colors group-hover:text-amber-100">
          {sub.title}
        </h3>
        {sub.tagline && (
          <p className="line-clamp-2 text-sm text-stone-400">{sub.tagline}</p>
        )}
        <div className="mt-1 flex items-center gap-4 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {sub.duration}
          </span>
          {lessonsCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> {lessonsCount} aulas
            </span>
          )}
        </div>
        <div className="mt-auto pt-5">
          <Button
            data-testid={`open-module-${sub.slug}`}
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="group/btn w-full rounded-full bg-amber-600 py-5 text-sm font-semibold text-stone-950 hover:bg-amber-700"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Acessar módulo
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </div>
      </div>
    </article>
  );
}
