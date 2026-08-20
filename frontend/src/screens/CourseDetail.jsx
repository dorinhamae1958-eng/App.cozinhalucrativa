import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, BRL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, Clock, BookOpen, Award, ShoppingCart, PlayCircle, Loader2, Layers, Video, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CourseDetail() {
  const { slug } = useParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/courses/${slug}`);
        setCourse(c.data);
        if (user) {
          try {
            const e = await api.get(`/enrollments/${slug}`);
            setEnrollment(e.data);
          } catch {
            setEnrollment(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, user]);

  const handleBuy = async () => {
    if (!user) {
      login();
      return;
    }
    // Redirect to plans page for combo/library discount awareness
    navigate(`/planos?curso=${slug}`);
  };

  const handleDevEnroll = async () => {
    if (!user) {
      login();
      return;
    }
    try {
      await api.post(`/dev/enroll/${slug}`);
      toast.success("Acesso liberado! Redirecionando…");
      const isCombo = Array.isArray(course?.combined_from) && course.combined_from.length > 0;
      navigate(isCombo ? `/curso/${slug}/modulos` : `/player/${slug}`);
    } catch {
      toast.error("Não foi possível liberar o acesso.");
    }
  };

  // Group modules by source (sub-course) for combined courses.
  // Result: [{ key, title, slug, modules, totalLessons }] — for combos this is 3 items.
  const moduleGroups = useMemo(() => {
    if (!course) return [];
    const list = course.modules || [];
    const order = [];
    const map = new Map();
    for (const m of list) {
      const key = m.source_slug || m.source_title || "__default__";
      if (!map.has(key)) {
        map.set(key, {
          key,
          slug: m.source_slug || null,
          title: m.source_title || null,
          modules: [],
        });
        order.push(key);
      }
      map.get(key).modules.push(m);
    }
    // Sort modules within each group by their leading number (e.g. "Módulo 01") when present.
    for (const k of order) {
      map.get(k).modules.sort((a, b) => {
        const na = parseInt((a.title?.match(/(\d+)/) || [])[1] || "0", 10);
        const nb = parseInt((b.title?.match(/(\d+)/) || [])[1] || "0", 10);
        return na - nb;
      });
      map.get(k).totalLessons = map.get(k).modules.reduce(
        (n, m) => n + (m.lessons?.length || 0), 0
      );
    }
    return order.map((k) => map.get(k));
  }, [course]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Curso não encontrado.</h1>
        <Link to="/" className="mt-4 inline-block text-amber-400 hover:underline">Voltar</Link>
      </div>
    );
  }

  const isEnrolled = !!enrollment;
  const isCombo = Array.isArray(course.combined_from) && course.combined_from.length > 0;

  return (
    <div data-testid="course-detail-page">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-stone-800">
        <div className="absolute inset-0">
          <img src={course.cover_image} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/70 to-stone-950/20" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-5 md:px-12 md:py-28">
          <div className="md:col-span-3">
            <Link
              data-testid="back-link"
              to="/"
              className="text-xs uppercase tracking-widest text-stone-400 hover:text-amber-400"
            >
              ← catálogo
            </Link>
            <p className="mt-6 text-xs uppercase tracking-[0.25em] font-semibold text-amber-500">
              {course.level}
            </p>
            <h1
              data-testid="course-title"
              className="mt-3 font-display text-4xl font-black leading-tight text-stone-50 sm:text-5xl lg:text-6xl"
            >
              {course.title}
            </h1>
            <p className="mt-4 text-lg text-stone-300 max-w-xl">{course.tagline}</p>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-stone-400">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> {course.duration}
              </span>
              <span className="inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" /> {isCombo ? `${course.combined_from.length} módulos` : `${course.modules?.length || 0} módulos`}
              </span>
              <span className="inline-flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" /> Certificado incluído
              </span>
            </div>
          </div>

          {/* PURCHASE CARD */}
          <aside className="md:col-span-2">
            <div
              data-testid="purchase-card"
              className="sticky top-24 overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/95 backdrop-blur"
            >
              <div className="relative aspect-video overflow-hidden">
                <img src={course.cover_image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 to-transparent" />
                <div className="absolute bottom-3 left-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 backdrop-blur">
                  <PlayCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-medium text-stone-100">Acesso 12 meses</span>
                </div>
              </div>

              <div className="p-6">
                {isEnrolled ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-amber-500 font-semibold">
                      você já tem acesso
                    </p>
                    <p className="mt-2 mb-6 text-sm text-stone-400">
                      Progresso: <span className="font-bold text-stone-100">{enrollment.progress}%</span>
                    </p>
                    <Button
                      data-testid="continue-course-btn"
                      onClick={() => navigate(isCombo ? `/curso/${slug}/modulos` : `/player/${slug}`)}
                      className="w-full rounded-full bg-amber-600 py-6 text-base font-semibold text-stone-50 shadow-[0_0_20px_rgba(217,119,6,0.3)] hover:bg-amber-700"
                    >
                      Continuar o curso
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-amber-500 font-semibold">acesso completo</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-5xl font-black text-amber-400">
                        {BRL(57)}
                      </span>
                      <span className="text-sm text-stone-500">à vista</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">pagamento único · libera <b className="text-stone-300">todos os cursos</b> por 12 meses</p>

                    <Button
                      data-testid="buy-course-btn"
                      onClick={handleBuy}
                      disabled={buying}
                      className="mt-6 w-full rounded-full bg-amber-600 py-6 text-base font-semibold text-stone-50 shadow-[0_0_20px_rgba(217,119,6,0.3)] hover:bg-amber-700"
                    >
                      {buying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                      {buying ? "Redirecionando…" : "Liberar acesso completo"}
                    </Button>

                    <button
                      data-testid="dev-enroll-btn"
                      onClick={handleDevEnroll}
                      className="mt-3 w-full text-xs text-stone-500 underline underline-offset-4 hover:text-amber-400"
                    >
                      Testar sem pagar (modo demo)
                    </button>

                    <ul className="mt-8 space-y-3 border-t border-stone-800 pt-6 text-sm">
                      {(course.highlights && course.highlights.length > 0
                        ? course.highlights
                        : [
                            "Acesso a TODOS os cursos",
                            "Aulas em vídeo + PDFs",
                            "Acesso 12 meses",
                            "Certificado ao concluir",
                          ]
                      ).map((b) => (
                        <li key={b} className="flex items-start gap-3 text-stone-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span className="leading-snug">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* IMPORTANT NOTICE — apenas Brigadeiro Gourmet */}
      {course.slug === "brigadeiro-gourmet" && (
        <section
          data-testid="brigadeiro-notice"
          className="relative overflow-hidden border-b-2"
          style={{ backgroundColor: "#0c0a09", borderColor: "rgba(245,158,11,0.4)", color: "#f5f5f4" }}
        >
          <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-14">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start md:gap-12">
              <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-4">
                <span
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
                  style={{ backgroundColor: "#f59e0b", color: "#0c0a09", boxShadow: "0 0 30px rgba(245,158,11,0.6)" }}
                >
                  <Sparkles className="h-6 w-6" strokeWidth={2.6} />
                </span>
                <p className="text-xs uppercase tracking-[0.28em] font-black" style={{ color: "#fcd34d" }}>
                  importante
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-black leading-tight sm:text-3xl md:text-4xl" style={{ color: "#ffffff" }}>
                  E-book completo disponível{" "}
                  <span className="rounded-md px-2 py-0.5" style={{ backgroundColor: "#f59e0b", color: "#0c0a09" }}>hoje</span>.
                  <br className="hidden sm:block" />
                  Videoaulas{" "}
                  <span className="rounded-md px-2 py-0.5" style={{ backgroundColor: "#f59e0b", color: "#0c0a09" }}>gratuitas</span>{" "}
                  a partir de 15/09.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: "#f5f5f4" }}>
                  O <strong style={{ color: "#ffffff", fontWeight: 900 }}>Curso de Brigadeiro Gourmet</strong> já está
                  disponível imediatamente em formato de e-book completo, com todo o conteúdo
                  necessário para você começar a produzir e vender.
                </p>
                <p className="mt-3 flex items-start gap-2 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: "#f5f5f4" }}>
                  <Video className="mt-1 h-5 w-5 shrink-0" strokeWidth={2.4} style={{ color: "#fcd34d" }} />
                  <span>
                    <strong style={{ color: "#ffffff", fontWeight: 900 }}>A partir de 15 de setembro</strong>, todas as
                    alunas receberão gratuitamente acesso às videoaulas, sem qualquer custo adicional.
                  </span>
                </p>

                <div
                  className="mt-6 rounded-2xl border-2 p-5 md:p-6"
                  style={{ backgroundColor: "#0c0a09", borderColor: "rgba(245,158,11,0.5)" }}
                >
                  <p className="text-xs uppercase tracking-[0.22em] font-black" style={{ color: "#fcd34d" }}>
                    ao adquirir o curso hoje, você garante:
                  </p>
                  <ul className="mt-4 space-y-3">
                    <li className="flex items-start gap-3 text-base md:text-[17px]" style={{ color: "#ffffff" }}>
                      <BookOpen className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.4} style={{ color: "#fcd34d" }} />
                      <span>Acesso <strong style={{ fontWeight: 900 }}>imediato</strong> ao e-book completo</span>
                    </li>
                    <li className="flex items-start gap-3 text-base md:text-[17px]" style={{ color: "#ffffff" }}>
                      <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.6} style={{ color: "#fcd34d" }} />
                      <span>Atualizações futuras <strong style={{ fontWeight: 900 }}>incluídas</strong> — sem custo</span>
                    </li>
                    <li className="flex items-start gap-3 text-base md:text-[17px]" style={{ color: "#ffffff" }}>
                      <Calendar className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.4} style={{ color: "#fcd34d" }} />
                      <span>Liberação <strong style={{ fontWeight: 900 }}>automática das videoaulas</strong> assim que forem publicadas</span>
                    </li>
                  </ul>
                </div>

                <p className="mt-5 text-sm md:text-base" style={{ color: "#f5f5f4" }}>
                  Você compra agora e recebe todo o conteúdo disponível hoje, além das aulas em vídeo assim que forem lançadas.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DIFFERENTIAL (only for combined courses that have it) */}
      {course.differential_title && (
        <section className="border-b border-stone-800 bg-gradient-to-br from-amber-950/40 via-stone-950 to-stone-950">
          <div className="mx-auto max-w-7xl px-6 py-14 md:px-12 md:py-16">
            <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
                  <Award className="h-6 w-6" />
                </span>
                <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-amber-500 md:hidden">
                  diferencial deste curso
                </span>
              </div>
              <div>
                <p className="hidden md:block mb-2 text-[10px] uppercase tracking-[0.28em] font-bold text-amber-500">
                  diferencial deste curso
                </p>
                <h2 className="font-display text-2xl font-black leading-tight text-stone-50 sm:text-3xl md:text-4xl">
                  {course.differential_title}
                </h2>
                {course.differential_text && (
                  <p className="mt-3 text-sm leading-relaxed text-stone-300 md:text-base md:max-w-3xl">
                    {course.differential_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DESCRIPTION + CURRICULUM */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:grid md:grid-cols-5 md:gap-16 md:px-12 md:py-24">
        <div className="md:col-span-3">
          <p className="mb-2 text-xs uppercase tracking-[0.25em] font-semibold text-amber-500">
            sobre o curso
          </p>
          <h2 className="font-display text-3xl font-black text-stone-50">
            O que você vai aprender
          </h2>
          <p className="mt-6 text-base leading-relaxed text-stone-300">{course.description}</p>

          <div className="mt-12">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] font-semibold text-amber-500">
              conteúdo
            </p>
            <h3 className="font-display text-2xl font-bold text-stone-50">Currículo do curso</h3>

            <Accordion type="multiple" className="mt-6" data-testid="curriculum-accordion">
              {isCombo ? (
                // Combined course → show one top-level item per sub-course (modalidade)
                moduleGroups.map((g, gi) => (
                  <AccordionItem
                    key={g.key}
                    value={g.key}
                    className="border-b border-stone-800"
                    data-testid={`curriculum-group-${g.slug || g.key}`}
                  >
                    <AccordionTrigger className="hover:no-underline hover:text-amber-400 [&[data-state=open]]:text-amber-400">
                      <div className="flex flex-1 items-center gap-4 pr-4 text-left">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10 font-display text-base font-black text-amber-400 tabular-nums">
                          {String(gi + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg font-bold">{g.title || "Módulo"}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-stone-500">
                            {g.modules.length} {g.modules.length === 1 ? "seção" : "seções"} · {g.totalLessons} aulas
                          </p>
                        </div>
                        <Layers className="h-4 w-4 shrink-0 text-amber-500/60" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-14 pb-6 text-sm leading-relaxed text-stone-400">
                      {g.modules.length > 0 ? (
                        <ul className="space-y-2">
                          {g.modules.map((m, mi) => (
                            <li key={m.id} className="rounded-lg border border-stone-800/60 bg-stone-950/40 p-3">
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 text-[10px] uppercase tracking-wider text-amber-500/70 tabular-nums font-bold">
                                  {String(mi + 1).padStart(2, "0")}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-stone-100">{m.title}</p>
                                  {m.lessons?.length > 0 && (
                                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-stone-500">
                                      {m.lessons.length} {m.lessons.length === 1 ? "aula" : "aulas"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="italic text-stone-500">Conteúdo prático em vídeo e material de apoio.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))
              ) : (
                // Standalone course → original flat list of modules
                course.modules?.map((m, i) => (
                <AccordionItem
                  key={m.id}
                  value={m.id}
                  className="border-b border-stone-800"
                >
                  <AccordionTrigger className="hover:no-underline hover:text-amber-400 [&[data-state=open]]:text-amber-400">
                    <div className="flex flex-1 items-center gap-4 pr-4 text-left">
                      <span className="font-display text-lg font-bold text-amber-500/60 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-lg">{m.title}</p>
                        {m.lessons?.length > 0 && (
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-stone-500">
                            {m.lessons.length} {m.lessons.length === 1 ? "aula" : "aulas"}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-11 pb-6 text-sm leading-relaxed text-stone-400">
                    {m.description && <p className="mb-3">{m.description}</p>}
                    {m.lessons?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {m.lessons.slice(0, 6).map((l) => (
                          <li key={l.id} className="flex items-center gap-2 text-xs text-stone-300">
                            <span className="h-1 w-1 rounded-full bg-amber-500/60" />
                            {l.title}
                          </li>
                        ))}
                        {m.lessons.length > 6 && (
                          <li className="text-xs text-stone-500 italic">
                            + {m.lessons.length - 6} outras aulas
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="italic text-stone-500">Conteúdo prático em vídeo e material de apoio.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                ))
              )}
            </Accordion>
          </div>
        </div>

        <aside className="mt-12 md:col-span-2 md:mt-0">
          <div className="rounded-2xl border border-stone-800 bg-stone-900 p-8">
            <p className="text-xs uppercase tracking-[0.25em] font-semibold text-amber-500">
              este modelo de negócio
            </p>
            <div className="mt-4 space-y-4">
              {course.ideal_for && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">
                    ideal para
                  </p>
                  <p className="text-sm text-stone-100 font-medium">{course.ideal_for}</p>
                </div>
              )}
              {course.initial_investment && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">
                    investimento inicial
                  </p>
                  <p className="text-sm text-stone-100 font-medium">{course.initial_investment}</p>
                </div>
              )}
              {course.sales_potential && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">
                    potencial de vendas
                  </p>
                  <p className="font-display text-xl font-bold text-emerald-400">
                    {course.sales_potential}
                  </p>
                </div>
              )}
              {course.tags?.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">
                    características
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {course.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[10px] font-medium text-amber-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-stone-800 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-3 font-semibold">
                instrutor
              </p>
              <p className="text-sm font-medium text-stone-100">{course.instructor}</p>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                +8.500 alunos formados com resultados comprovados.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
