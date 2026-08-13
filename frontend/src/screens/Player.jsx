import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, drivePreview } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check, Loader2, Award, ExternalLink, PlayCircle, FileText,
  Image as ImageIcon, FileSpreadsheet, File as FileIcon, RefreshCw, RotateCcw,
  Sticker, Clock, Calendar, BookOpen, Video, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Baixa a imagem de uma aula (Drive) e gera um PNG circular 1024x1024
 * pronto para adesivo. Usa o proxy /api/drive-image/:id para evitar CORS.
 */
async function downloadCircularSticker(lesson) {
  const id = lesson.id;
  if (!id) throw new Error('sem id');
  const url = `/api/drive-image/${id}`;
  const img = await new Promise((resolve, reject) => {
    const el = new window.Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('falha ao carregar imagem'));
    el.src = url;
  });
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  // "cover": preencher o círculo mantendo proporção, cortando o excedente
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(size / iw, size / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const dl = document.createElement('a');
  dl.href = URL.createObjectURL(blob);
  const safe = (lesson.title || 'adesivo').toString().replace(/[^\w-]+/g, '_');
  dl.download = `${safe}-adesivo.png`;
  document.body.appendChild(dl);
  dl.click();
  dl.remove();
  setTimeout(() => URL.revokeObjectURL(dl.href), 5000);
}

/**
 * LessonFrame — renderiza a aula (iframe do Drive).
 * Suporta `end_at_seconds`: quando definido, ao atingir o tempo
 * substitui o iframe por um overlay "Apresentação concluída",
 * garantindo o corte editorial do vídeo.
 */
function LessonFrame({ lesson, courseSlug }) {
  const end = Number(lesson.end_at_seconds) || 0;
  const start = Number(lesson.start_at_seconds) || 0;
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setEnded(false);
    if (!end) return;
    // If a start time is set, only count the interval between start and end.
    const duration = Math.max(0, end - start) * 1000;
    const t = setTimeout(() => setEnded(true), duration);
    return () => clearTimeout(t);
  }, [lesson.id, end, start]);

  // Brigadeiro Gourmet — videoaulas ainda não publicadas.
  // Qualquer aula de vídeo deste curso mostra o aviso oficial no lugar do
  // iframe do Drive (que caía em "arquivo não existe" enquanto a professora
  // não publica os vídeos definitivos, previstos para 15/09).
  if (courseSlug === "brigadeiro-gourmet" && lesson.type === "video") {
    return <BrigadeiroVideoNotice />;
  }

  if (ended) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-stone-950 p-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-500/15">
          <Check className="h-8 w-8 text-amber-400" />
        </div>
        <div>
          <h4 className="font-display text-xl font-black text-stone-50">
            Apresentação concluída
          </h4>
          <p className="mt-1 text-sm text-stone-400">
            Continue para a primeira aula do módulo.
          </p>
        </div>
        <Button
          onClick={() => setEnded(false)}
          variant="ghost"
          className="rounded-full border border-stone-800 bg-stone-900 px-5 py-4 text-xs text-stone-200 hover:bg-stone-800"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Rever apresentação
        </Button>
      </div>
    );
  }

  const baseSrc = lesson.url || drivePreview(lesson.id);
  // Google Drive respects only start time via `#t=Xs` fragment.
  const src = start > 0 ? `${baseSrc}#t=${start}s` : baseSrc;

  // "Em breve" — módulo bloqueado com data de liberação.
  if (lesson.type === 'notice' || lesson.coming_soon) {
    return (
      <div
        data-testid="lesson-notice"
        className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 p-10 text-center"
      >
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10">
          <Calendar className="h-9 w-9 text-amber-400" strokeWidth={2} />
        </div>
        <h3 className="mb-2 font-display text-3xl font-black text-stone-50 md:text-4xl">
          🎉 Você garantiu sua vaga!
        </h3>
        <p className="max-w-xl text-base leading-relaxed text-stone-300">
          Os módulos serão liberados a partir de{' '}
          <span className="font-bold text-amber-400">03 de agosto</span>.
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
          Enquanto isso, aproveite as ferramentas da plataforma, os materiais de
          apoio e prepare-se para começar sua jornada com o pé direito.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2">
          <Calendar className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">
            Início das aulas: 03 de agosto
          </span>
        </div>
      </div>
    );
  }

  // Native HTML5 video for local/remote MP4 lessons (masterclass, uploaded aulas).
  const isDirectVideo = lesson.type === 'video' && typeof lesson.url === 'string' &&
    /\.(mp4|webm|ogv|mov|m4v)(\?|$)/i.test(lesson.url);
  if (isDirectVideo) {
    return (
      <video
        key={lesson.id}
        src={src}
        title={lesson.title}
        controls
        controlsList="nodownload"
        playsInline
        className="h-full w-full bg-black"
        data-testid="lesson-video-native"
      />
    );
  }

  // Image lessons with a crop override use the /api/drive-image proxy — render
  // as <img> instead of Drive iframe so the crop is actually visible.
  if (lesson.type === 'image' && lesson.crop) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-950 p-4">
        <img
          key={lesson.id}
          src={baseSrc}
          alt={lesson.title}
          className="max-h-full max-w-full object-contain"
          data-testid="cropped-image"
        />
      </div>
    );
  }

  return (
    <iframe
      key={`${lesson.id}-${start}`}
      src={src}
      title={lesson.title}
      className="h-full w-full"
      allow="autoplay; encrypted-media"
      allowFullScreen
    />
  );
}

/**
 * Aviso oficial do curso Brigadeiro Gourmet: e-book já liberado hoje,
 * videoaulas gratuitas a partir de 15/09. Substitui o iframe do Drive
 * quando o vídeo definitivo ainda não foi publicado.
 */
function BrigadeiroVideoNotice() {
  return (
    <div
      data-testid="brigadeiro-video-notice"
      className="h-full w-full overflow-y-auto"
      style={{ backgroundColor: "#0c0a09", color: "#f5f5f4" }}
    >
      <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-10 md:px-10 md:py-12">
        <div className="mb-5 flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            style={{ backgroundColor: "#f59e0b", color: "#0c0a09", boxShadow: "0 0 30px rgba(245,158,11,0.6)" }}
          >
            <Sparkles className="h-5 w-5" strokeWidth={2.6} />
          </span>
          <p className="text-xs uppercase tracking-[0.28em] font-black" style={{ color: "#fcd34d" }}>
            importante
          </p>
        </div>

        <h3 className="font-display text-2xl font-black leading-tight md:text-3xl" style={{ color: "#ffffff" }}>
          E-book completo disponível{" "}
          <span className="rounded-md px-2 py-0.5" style={{ backgroundColor: "#f59e0b", color: "#0c0a09" }}>hoje</span>.
          <br className="hidden sm:block" />
          Videoaulas{" "}
          <span className="rounded-md px-2 py-0.5" style={{ backgroundColor: "#f59e0b", color: "#0c0a09" }}>gratuitas</span>{" "}
          a partir de 15/09.
        </h3>

        <p className="mt-5 text-base leading-relaxed md:text-lg" style={{ color: "#f5f5f4" }}>
          O <strong style={{ color: "#ffffff", fontWeight: 900 }}>Curso de Brigadeiro Gourmet</strong> já está
          disponível imediatamente em formato de e-book completo, com todo o conteúdo
          necessário para você começar a produzir e vender.
        </p>
        <p className="mt-3 flex items-start gap-2 text-base leading-relaxed md:text-lg" style={{ color: "#f5f5f4" }}>
          <Video className="mt-1 h-5 w-5 shrink-0" strokeWidth={2.4} style={{ color: "#fcd34d" }} />
          <span>
            <strong style={{ color: "#ffffff", fontWeight: 900 }}>A partir de 15 de setembro</strong>, todas
            as alunas receberão gratuitamente acesso às videoaulas, sem qualquer custo adicional.
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
  );
}

const LESSON_ICONS = {
  video: PlayCircle,
  pdf: FileText,
  image: ImageIcon,
  sheet: FileSpreadsheet,
  doc: FileText,
  file: FileIcon,
  notice: Clock,
};

const LESSON_LABEL = {
  video: "Vídeo",
  pdf: "PDF",
  image: "Imagem",
  sheet: "Planilha",
  doc: "Documento",
  file: "Arquivo",
  notice: "Em breve",
};

function renderModuleItem(m, i, { completed, activeLessonId, setActiveLessonId }) {
  const total = m.lessons?.length || 0;
  const doneInModule = (m.lessons || []).filter((l) => completed.has(l.id)).length;
  return (
    <AccordionItem
      key={m.id}
      value={m.id}
      className="rounded-lg border border-stone-800 bg-stone-950/60 px-3"
    >
      <AccordionTrigger className="py-3 text-left hover:no-underline [&[data-state=open]]:text-amber-400">
        <div className="flex flex-1 items-center gap-3 min-w-0 pr-3">
          <span className="font-display text-sm font-bold text-amber-500/70 tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-100">{m.title}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-stone-500">
              {`${doneInModule}/${total} aulas`}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-3 pt-1">
        <ul className="space-y-1">
          {m.lessons.map((l) => {
            const Icon = LESSON_ICONS[l.type] || FileIcon;
            const isDone = completed.has(l.id);
            const isActive = activeLessonId === l.id;
            return (
              <li key={l.id}>
                <button
                  data-testid={`lesson-btn-${l.id}`}
                  onClick={() => setActiveLessonId(l.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                    isActive
                      ? "bg-amber-500/20 ring-1 ring-amber-400/60"
                      : "hover:bg-stone-800/80"
                  }`}
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors ${
                      isDone
                        ? "bg-emerald-600/90 text-stone-50"
                        : isActive
                        ? "bg-amber-600 text-stone-50"
                        : "bg-stone-800 text-stone-400 group-hover:bg-stone-700"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-semibold ${
                        isActive ? "text-amber-50" : "text-stone-100"
                      }`}
                      title={l.title || `${LESSON_LABEL[l.type] || "Aula"} sem título`}
                    >
                      {l.title || `${LESSON_LABEL[l.type] || "Aula"} sem título`}
                    </p>
                    <p
                      className={`text-[10px] uppercase tracking-wider ${
                        isActive ? "text-amber-300/90" : "text-stone-400"
                      }`}
                    >
                      {LESSON_LABEL[l.type] || "Arquivo"}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function Player() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    try {
      const [c, e] = await Promise.all([
        api.get(`/courses/${slug}`),
        api.get(`/enrollments/${slug}`).catch(() => ({ data: { course_slug: slug, completed_lessons: [] } })),
      ]);
      setCourse(c.data);
      setEnrollment(e.data);
      // pick first playable lesson (prioritize modules with mostly video lessons)
      const PLAYABLE = new Set(["video", "pdf", "image", "sheet", "doc"]);
      const SUPPORT_TITLE = /(vsl|v[ií]deo\s+de\s+vendas|p[aá]gina\s+de\s+vendas|p[aá]ginas\s+de\s+vendas|criativos?|criativos?\s+vencedores|capa\s+facebook|criativo\s+stories|imagens|lista\s+de\s+p[uú]blicos|p[uú]blicos|pdf|material\s+do\s+curso|material\s+de\s+apoio|b[oô]nus|obrigado)/i;
      const isVideoModule = (m) => {
        const t = (m.title || "").trim();
        if (SUPPORT_TITLE.test(t)) return false;
        if (/^m[oó]dulo\s+\d+/i.test(t)) return true;
        if (/^aulas?$/i.test(t)) return true;
        const ls = m.lessons || [];
        if (!ls.length) return false;
        return ls.filter((l) => l.type === "video").length / ls.length >= 0.6;
      };
      const orderedModules = [...(c.data.modules || [])]
        .map((m) => ({ ...m, lessons: (m.lessons || []).filter((l) => PLAYABLE.has(l.type)) }))
        .filter((m) => m.lessons.length > 0)
        .sort((a, b) => Number(isVideoModule(b)) - Number(isVideoModule(a)));
      const firstLesson = orderedModules[0]?.lessons?.[0];
      setActiveLessonId((prev) => prev || firstLesson?.id || null);
    } catch (err) {
      toast.error("Curso não encontrado.");
      navigate(`/curso/${slug}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    activeLesson,
    activeModule,
    totalLessons,
    defaultOpenModules,
    videoModules,
    videoGroups,
    supportModules,
    supportGroups,
  } = useMemo(() => {
    if (!course) {
      return {
        activeLesson: null,
        activeModule: null,
        totalLessons: 0,
        defaultOpenModules: [],
        videoModules: [],
        videoGroups: [],
        supportModules: [],
        supportGroups: [],
      };
    }
    // Filter out empty/broken modules and classify:
    //  - Video Aulas: titles matching "Módulo NN"
    //  - Material de Apoio: everything else (criativos, PDFs, páginas, imagens, VSLs...)
    // Also strip "broken" lessons: unknown file types (.json, .txt, Elementor exports),
    // which are unplayable in the Drive preview.
    const PLAYABLE = new Set(["video", "pdf", "image", "sheet", "doc"]);
    const cleanLessons = (m) => (m.lessons || []).filter((l) => PLAYABLE.has(l.type));
    // Hide "Bônus Extra" / "Bônus Geral" / "🎁 Bônus" (course-level and
    // universal bonuses) from the course sidebar — those lessons live on
    // the dedicated /bonus-extra page under the "Aprender" tab.
    const isBonusExtraModule = (m) => {
      const raw = (m.title || "");
      if (raw.includes("🎁")) return true;
      const t = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (t === "bonus extra" || t === "bonus geral" || t === "bonus") return true;
      if (/(^|\s)bonus(\s|$)/i.test(t)) return true;
      return false;
    };
    const clean = (course.modules || [])
      .filter((m) => !isBonusExtraModule(m))
      .map((m) => ({ ...m, lessons: cleanLessons(m) }))
      .filter((m) => m.lessons.length > 0);
    // Titles that are ALWAYS material de apoio (marketing / sales assets)
    // even when they contain videos.
    const SUPPORT_TITLE = /(vsl|v[ií]deo\s+de\s+vendas|p[aá]gina\s+de\s+vendas|p[aá]ginas\s+de\s+vendas|criativos?|criativos?\s+vencedores|capa\s+facebook|criativo\s+stories|imagens|lista\s+de\s+p[uú]blicos|p[uú]blicos|pdf|material\s+do\s+curso|material\s+de\s+apoio|b[oô]nus|obrigado)/i;
    const isVideoModule = (m) => {
      const t = (m.title || "").trim();
      if (SUPPORT_TITLE.test(t)) return false;
      if (/^m[oó]dulo\s+\d+/i.test(t)) return true;
      if (/^aulas?$/i.test(t)) return true;
      // Fallback: majority of lessons are actual videos.
      const lessons = m.lessons || [];
      if (!lessons.length) return false;
      const videos = lessons.filter((l) => l.type === "video").length;
      return videos / lessons.length >= 0.6;
    };

    const vids = clean.filter(isVideoModule);
    const supp = clean.filter((m) => !isVideoModule(m));

    // Helper: group modules by source_title, preserving order, sorting by number inside.
    const buildGroups = (list) => {
      const order = [];
      const map = new Map();
      for (const m of list) {
        const key = m.source_title || "__default__";
        if (!map.has(key)) { map.set(key, []); order.push(key); }
        map.get(key).push(m);
      }
      for (const key of order) {
        map.get(key).sort((a, b) => {
          const na = parseInt((a.title.match(/(\d+)/) || [])[1] || "0", 10);
          const nb = parseInt((b.title.match(/(\d+)/) || [])[1] || "0", 10);
          return na - nb;
        });
      }
      return order.map((k) => ({
        key: k,
        title: k === "__default__" ? null : k,
        modules: map.get(k),
        totalLessons: map.get(k).reduce((n, m) => n + (m.lessons?.length || 0), 0),
      }));
    };
    const videoGroups = buildGroups(vids);
    const supportGroups = buildGroups(supp);
    // Flat list (for lookup / initial selection).
    const vidsFlat = videoGroups.flatMap((g) => g.modules);
    const suppFlat = supportGroups.flatMap((g) => g.modules);

    let al = null, am = null;
    for (const m of [...vidsFlat, ...suppFlat]) {
      for (const l of m.lessons || []) {
        if (l.id === activeLessonId) { al = l; am = m; }
      }
    }
    const firstModule = vidsFlat[0] || suppFlat[0];
    return {
      activeLesson: al,
      activeModule: am,
      totalLessons: clean.reduce((n, m) => n + (m.lessons?.length || 0), 0),
      defaultOpenModules: activeLessonId && am ? [am.id] : (firstModule ? [firstModule.id] : []),
      videoModules: vidsFlat,
      videoGroups,
      supportModules: suppFlat,
      supportGroups,
    };
  }, [course, activeLessonId]);

  const completed = new Set(enrollment?.completed_lessons || []);

  const toggleLesson = async (lessonId) => {
    try {
      const { data } = await api.post("/enrollments/complete-lesson", {
        course_slug: slug,
        lesson_id: lessonId,
      });
      setEnrollment(data);
      if (data.progress === 100) toast.success("Parabéns! Você concluiu o curso 🎉");
    } catch {
      toast.error("Erro ao atualizar progresso.");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post(`/sync/${slug}`);
      toast.success(`Sincronizado: ${data.modules_count} módulos, ${data.lessons_count} aulas.`);
      await load();
    } catch {
      toast.error("Não foi possível sincronizar do Drive.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }
  if (!course) return null;

  const noLessons = totalLessons === 0;

  return (
    <div data-testid="player-page" className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex flex-col gap-3">
        <Link
          data-testid="back-to-dashboard"
          to="/meus-cursos"
          className="text-xs uppercase tracking-widest text-stone-400 hover:text-amber-400"
        >
          ← meus cursos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-black leading-tight text-stone-50 sm:text-4xl">
            {course.title}
          </h1>
          <button
            data-testid="sync-drive-btn"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar do Drive"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* MAIN PLAYER */}
        <div>
          <div
            data-testid="lesson-player"
            className="relative aspect-video overflow-hidden rounded-2xl border border-stone-800 bg-black shadow-2xl"
          >
            {activeLesson ? (
              <LessonFrame lesson={activeLesson} courseSlug={slug} />
            ) : (
              <div className="flex h-full items-center justify-center text-center p-8">
                <div>
                  <PlayCircle className="mx-auto h-12 w-12 text-stone-600" />
                  <p className="mt-4 text-stone-400 text-sm">
                    {noLessons
                      ? "Ainda não há aulas sincronizadas. Clique em 'Sincronizar do Drive'."
                      : "Selecione uma aula na barra ao lado."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {activeLesson && (
            <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.25em] font-semibold text-amber-500">
                    {activeModule?.title}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-stone-50 break-words">
                    {activeLesson.title}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500 uppercase tracking-wider">
                    {LESSON_LABEL[activeLesson.type] || "Arquivo"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  data-testid="mark-lesson-complete"
                  onClick={() => toggleLesson(activeLesson.id)}
                  className={
                    completed.has(activeLesson.id)
                      ? "rounded-full bg-emerald-700 px-6 font-semibold text-stone-50 hover:bg-emerald-800"
                      : "rounded-full bg-amber-600 px-6 font-semibold text-stone-50 hover:bg-amber-700"
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  {completed.has(activeLesson.id) ? "Aula concluída" : "Marcar como concluída"}
                </Button>
                <a
                  data-testid="open-in-drive-btn"
                  href={activeLesson.url || `https://drive.google.com/file/d/${activeLesson.id}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-800 px-6 py-2.5 text-sm font-medium text-stone-100 transition-colors hover:bg-stone-700"
                >
                  {activeLesson.url ? "Abrir em outra aba" : "Abrir no Drive"} <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {activeLesson.type === 'image' && (
                  <Button
                    data-testid="download-circular-sticker"
                    variant="ghost"
                    className="rounded-full border border-amber-700/60 bg-amber-500/10 px-6 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
                    onClick={async () => {
                      const tid = toast.loading('Gerando adesivo circular…');
                      try {
                        await downloadCircularSticker(activeLesson);
                        toast.success('Adesivo pronto! Verifique seus downloads.', { id: tid });
                      } catch (e) {
                        toast.error('Não foi possível gerar o adesivo desta imagem.', { id: tid });
                      }
                    }}
                  >
                    <Sticker className="mr-2 h-4 w-4" /> Baixar como adesivo circular
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside
          data-testid="player-sidebar"
          className="rounded-2xl border border-stone-800 bg-stone-900 p-6 lg:sticky lg:top-24 lg:h-fit lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
        >
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-stone-400">seu progresso</span>
              <span className="font-display text-xl font-black text-amber-400">
                {enrollment?.progress || 0}%
              </span>
            </div>
            <Progress
              value={enrollment?.progress || 0}
              className="h-2 bg-stone-800 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-amber-400"
            />
            <p className="mt-2 text-xs text-stone-500">
              {completed.size} de {totalLessons} aulas concluídas
            </p>
          </div>

          <p className="mb-3 text-xs uppercase tracking-[0.2em] font-semibold text-amber-500">
            conteúdo do curso
          </p>

          {videoModules.length > 0 && (
            <div className="mb-8" data-testid="video-lessons-section">
              <div className="mb-3 flex items-center gap-2 border-b border-stone-800 pb-2">
                <PlayCircle className="h-4 w-4 text-amber-400" />
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-stone-50">
                  Video Aulas
                </p>
                <span className="ml-auto rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-stone-300">
                  {videoModules.reduce((n, m) => n + (m.lessons?.length || 0), 0)} aulas
                </span>
              </div>
              {videoGroups.map((g, gi) => {
                let counter = 0;
                const isCombo = g.title && videoGroups.length > 1;
                return (
                  <div key={g.key} className={gi > 0 ? "mt-5" : ""}>
                    {isCombo && (
                      <div
                        data-testid={`video-group-${g.key.replace(/\s+/g, '-').toLowerCase()}`}
                        className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-amber-500 bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent px-3 py-2"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
                          {gi + 1}
                        </span>
                        <p className="flex-1 truncate font-display text-sm font-bold text-amber-100">
                          {g.title}
                        </p>
                        <span className="text-[10px] uppercase tracking-wider text-amber-400/80">
                          {g.totalLessons} aulas
                        </span>
                      </div>
                    )}
                    <Accordion
                      type="multiple"
                      defaultValue={defaultOpenModules}
                      className="space-y-1"
                      data-testid={`video-modules-accordion-${gi}`}
                    >
                      {g.modules.map((m) => renderModuleItem(m, counter++, {
                        completed, activeLessonId, setActiveLessonId,
                      }))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}

          {supportModules.length > 0 && (
            <div data-testid="support-material-section">
              <div className="mb-3 flex items-center gap-2 border-b border-stone-800 pb-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-stone-50">
                  Material de Apoio
                </p>
                <span className="ml-auto rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-stone-300">
                  {supportModules.reduce((n, m) => n + (m.lessons?.length || 0), 0)} arquivos
                </span>
              </div>
              {supportGroups.map((g, gi) => {
                let counter = 0;
                const isCombo = g.title && supportGroups.length > 1;
                return (
                  <div key={g.key} className={gi > 0 ? "mt-5" : ""}>
                    {isCombo && (
                      <div
                        data-testid={`support-group-${g.key.replace(/\s+/g, '-').toLowerCase()}`}
                        className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-stone-500 bg-gradient-to-r from-stone-700/40 via-stone-700/10 to-transparent px-3 py-2"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone-600/40 text-[10px] font-bold text-stone-200">
                          {gi + 1}
                        </span>
                        <p className="flex-1 truncate font-display text-sm font-bold text-stone-100">
                          {g.title}
                        </p>
                        <span className="text-[10px] uppercase tracking-wider text-stone-400">
                          {g.totalLessons} arquivos
                        </span>
                      </div>
                    )}
                    <Accordion
                      type="multiple"
                      className="space-y-1"
                      data-testid={`support-modules-accordion-${gi}`}
                    >
                      {g.modules.map((m) => renderModuleItem(m, counter++, {
                        completed, activeLessonId, setActiveLessonId,
                      }))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}

          {videoModules.length === 0 && supportModules.length === 0 && (
            <p className="mt-2 text-xs text-stone-500 italic">
              Ainda não há conteúdo sincronizado. Clique em &quot;Sincronizar do Drive&quot;.
            </p>
          )}

          {enrollment?.progress === 100 && (
            <Link to={`/certificado/${slug}`}>
              <Button
                data-testid="certificate-btn"
                className="mt-6 w-full rounded-full bg-amber-600 py-5 font-semibold text-stone-50 shadow-[0_0_25px_rgba(217,119,6,0.4)] hover:bg-amber-700"
              >
                <Award className="mr-2 h-4 w-4" /> Ver meu certificado
              </Button>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
