import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles, Send, Search, Loader2, ArrowLeft, ChevronDown, ChevronUp,
  CheckCircle2, Clock3, Globe2, Lock, Heart, Eye, BookOpen, MessageCircleHeart,
  Lightbulb, Filter, ChefHat,
} from "lucide-react";

/* Paleta Elevare / Cozinha Lucrativa */
const TERRA = "#A24D2A";
const TERRA_DARK = "#8A3F21";
const CREAM = "#FAF6F0";
const CREAM_2 = "#F4E1D5";
const BORDER = "#EED3C3";
const INK = "#2E1B12";
const INK_MUTED = "#5F4A3F";
const HONEY = "#D89A5B";
const SAGE = "#7A9A6A";

const SUBJECT_MAX = 140;
const QUESTION_MAX = 4000;
const QUESTION_MIN = 10;

const STATUS_LABEL = {
  aguardando: { label: "Aguardando Resposta", icon: Clock3, color: "#B36C36", bg: "#FCEEDE" },
  respondida: { label: "Respondida", icon: CheckCircle2, color: "#4E7A3E", bg: "#EAF4E1" },
};

export default function PlantaoDuvidas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ categories: [] });
  const [tab, setTab] = useState("nova");
  const [mine, setMine] = useState([]);
  const [libraryData, setLibraryData] = useState(null);
  const [loadingMine, setLoadingMine] = useState(true);

  useEffect(() => {
    api.get("/plantao/meta").then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setLoadingMine(false); return; }
    setLoadingMine(true);
    api.get("/plantao/duvidas/mine")
      .then((r) => setMine(r.data.items || []))
      .catch(() => setMine([]))
      .finally(() => setLoadingMine(false));
  }, [user, tab]);

  useEffect(() => {
    refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshLibrary = (params = {}) => {
    return api.get("/plantao/library", { params })
      .then((r) => setLibraryData(r.data))
      .catch(() => setLibraryData({ items: [], top_viewed: [], recent: [], counts_by_category: {}, categories: [] }));
  };

  const unreadAnswered = useMemo(
    () => mine.filter((d) => d.status === "respondida" && !d.read_by_student).length,
    [mine]
  );

  if (!user) {
    return (
      <div className="min-h-[80vh]" style={{ background: CREAM }}>
        <PageContainer>
          <NotLoggedIn />
          <div className="mt-10">
            {libraryData && <BiblioSection data={libraryData} categories={meta.categories} refresh={refreshLibrary} />}
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]" style={{ background: CREAM }}>
      <PageContainer>
        <div className="mb-8">
          <button
            data-testid="plantao-back"
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: TERRA_DARK }}
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="flex items-start gap-4">
            <div
              className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_30px_rgba(162,77,42,0.35)] sm:grid"
              style={{ background: `linear-gradient(135deg, ${TERRA} 0%, ${TERRA_DARK} 100%)` }}
            >
              <MessageCircleHeart className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: TERRA_DARK }}>
                <Sparkles className="h-3 w-3" /> uma conversa entre mentora e aluna
              </p>
              <h1 className="font-display text-3xl font-black leading-tight md:text-4xl" style={{ color: INK }}>
                Plantão de Dúvidas
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed" style={{ color: INK_MUTED }}>
                Envie sua pergunta com carinho. A professora responde no seu ritmo, aqui dentro
                da plataforma — e você decide se sua dúvida pode ajudar outras alunas.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} data-testid="plantao-tabs">
          <TabsList
            className="mb-6 h-auto w-full flex-wrap gap-1 rounded-full p-1 border"
            style={{ background: "#FFFDF9", borderColor: BORDER }}
          >
            <TabTrig value="nova" testId="tab-nova" label="Nova Dúvida" icon={Sparkles} />
            <TabTrig value="minhas" testId="tab-minhas" label="Minhas Dúvidas" icon={MessageCircleHeart} badge={unreadAnswered} />
            <TabTrig value="biblioteca" testId="tab-biblioteca" label="Perguntas da Comunidade" icon={BookOpen} />
          </TabsList>

          <TabsContent value="nova">
            <NewQuestionSection categories={meta.categories} onSent={() => setTab("minhas")} />
          </TabsContent>

          <TabsContent value="minhas">
            <MyQuestionsSection
              items={mine}
              loading={loadingMine}
              onRefresh={() => api.get("/plantao/duvidas/mine").then((r) => setMine(r.data.items || []))}
              categories={meta.categories}
            />
          </TabsContent>

          <TabsContent value="biblioteca">
            {libraryData && <BiblioSection data={libraryData} categories={meta.categories} refresh={refreshLibrary} />}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}

function PageContainer({ children }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14" style={{ color: INK }}>
      {children}
    </div>
  );
}

function TabTrig({ value, label, icon: Icon, testId, badge }) {
  return (
    <TabsTrigger
      value={value}
      data-testid={testId}
      className="flex-1 rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-[#A24D2A] data-[state=active]:text-white data-[state=active]:shadow-[0_6px_16px_rgba(162,77,42,0.35)]"
      style={{ color: INK }}
    >
      <Icon className="mr-1.5 h-4 w-4" />
      {label}
      {badge > 0 && (
        <span
          data-testid={`${testId}-badge`}
          className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white"
          style={{ background: HONEY }}
        >
          {badge}
        </span>
      )}
    </TabsTrigger>
  );
}

/* ---------- Nova Dúvida ---------- */
function NewQuestionSection({ categories, onSent }) {
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("outros");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [openSuggest, setOpenSuggest] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const q = `${subject} ${question}`.trim();
    if (q.length < 4) { setSuggestions([]); setOpenSuggest(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.get("/plantao/suggest", { params: { q } })
        .then((r) => {
          setSuggestions(r.data.items || []);
          setOpenSuggest((r.data.items || []).length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 350);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [subject, question]);

  const canSubmit =
    subject.trim().length >= 3 &&
    question.trim().length >= QUESTION_MIN &&
    !sending;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!canSubmit) { toast.error("Escreva um assunto (3+ letras) e uma dúvida com pelo menos 10 caracteres."); return; }
    setSending(true);
    try {
      await api.post("/plantao/duvidas", { subject: subject.trim(), question: question.trim(), category });
      toast.success("Sua dúvida foi enviada com carinho. A professora receberá agora.");
      setSubject(""); setQuestion(""); setCategory("outros");
      setSuggestions([]); setOpenSuggest(false);
      onSent && onSent();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Não foi possível enviar sua dúvida.");
    } finally { setSending(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <form
        data-testid="plantao-form"
        onSubmit={handleSubmit}
        className="rounded-3xl border p-6 md:p-8 shadow-[0_1px_2px_rgba(46,27,18,0.04)]"
        style={{ borderColor: BORDER, background: "#FFFDF9" }}
      >
        <div>
          <Label className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: TERRA_DARK }}>
            Assunto
          </Label>
          <Input
            data-testid="new-subject-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
            placeholder="Ex.: Meu brigadeiro está muito mole, o que fazer?"
            className="mt-2 h-12 border-[#EED3C3] bg-white text-[15px]"
            maxLength={SUBJECT_MAX}
            disabled={sending}
          />
          <div className="mt-1 flex justify-end text-[11px]" style={{ color: INK_MUTED }}>{subject.length}/{SUBJECT_MAX}</div>
        </div>

        <div className="mt-5">
          <Label className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: TERRA_DARK }}>Categoria</Label>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="new-category-list">
            {categories?.map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid={`new-cat-${c.id}`}
                onClick={() => setCategory(c.id)}
                className="rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all"
                style={{
                  borderColor: category === c.id ? TERRA : BORDER,
                  background: category === c.id ? TERRA : "#fff",
                  color: category === c.id ? "#fff" : INK,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: TERRA_DARK }}>Sua pergunta</Label>
          <Textarea
            data-testid="new-question-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, QUESTION_MAX))}
            placeholder="Conte com detalhes o que aconteceu, o que já tentou e onde travou. Quanto mais detalhes, melhor será a resposta."
            className="mt-2 min-h-[200px] resize-y border-[#EED3C3] bg-white text-[15px] leading-relaxed"
            maxLength={QUESTION_MAX}
            disabled={sending}
          />
          <div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: INK_MUTED }}>
            <span>
              {question.trim().length < QUESTION_MIN
                ? `Escreva pelo menos ${QUESTION_MIN} caracteres`
                : "Ótimo, sua dúvida está pronta para envio"}
            </span>
            <span>{question.length}/{QUESTION_MAX}</span>
          </div>
        </div>

        {openSuggest && suggestions.length > 0 && (
          <div
            data-testid="live-suggestions"
            className="mt-5 rounded-2xl border p-4"
            style={{ borderColor: "#F3D9C4", background: "#FEF7EF" }}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" style={{ color: HONEY }} />
              <p className="text-sm font-bold" style={{ color: TERRA_DARK }}>
                Talvez sua dúvida já tenha sido respondida
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              {suggestions.map((s) => (<li key={s.id}><PreviewItem s={s} /></li>))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs" style={{ color: INK_MUTED }}>
            <Lock className="h-3.5 w-3.5" style={{ color: HONEY }} />
            Sua dúvida vai direto para a professora — só será pública se você escolher depois.
          </p>
          <Button
            data-testid="new-submit-btn"
            type="submit"
            disabled={!canSubmit}
            className="h-12 rounded-full px-8 text-base font-bold text-white shadow-[0_6px_20px_rgba(162,77,42,0.35)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            style={{ backgroundColor: TERRA }}
          >
            {sending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>) : (<><Send className="mr-2 h-4 w-4" /> Enviar dúvida</>)}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <SideCard icon={MessageCircleHeart} title="Como funciona"
          body="Você escreve. A professora responde aqui na plataforma. Você recebe uma notificação e decide se compartilha com outras alunas." />
        <SideCard icon={Clock3} title="Ritmo humano"
          body="A resposta chega em até 48h úteis, com todo o cuidado que o assunto merece." />
        <SideCard icon={BookOpen} title="Vira conhecimento vivo"
          body="Cada dúvida respondida (com sua permissão) fortalece a base de conhecimento que todas nós compartilhamos." />
      </aside>
    </div>
  );
}

function PreviewItem({ s }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-white p-3" style={{ borderColor: BORDER }}>
      <button
        type="button"
        data-testid={`suggest-item-${s.id}`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold" style={{ color: INK }}>{s.subject}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[13px]" style={{ color: INK_MUTED }}>{s.question}</p>
          <div className="rounded-lg p-3 text-[13px] leading-relaxed" style={{ background: CREAM, color: INK }}>
            <span className="mr-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Resposta</span>
            {s.answer}
          </div>
        </div>
      )}
    </div>
  );
}

function SideCard({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: CREAM, borderColor: BORDER }}>
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ backgroundColor: TERRA }}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </div>
        <p className="font-display text-sm font-black" style={{ color: INK }}>{title}</p>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: INK_MUTED }}>{body}</p>
    </div>
  );
}

/* ---------- Minhas Dúvidas ---------- */
function MyQuestionsSection({ items, loading, onRefresh, categories }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} />
      </div>
    );
  }
  if (!items.length) {
    return (
      <div data-testid="empty-mine" className="rounded-3xl border p-10 text-center" style={{ borderColor: BORDER, background: "#FFFDF9" }}>
        <MessageCircleHeart className="mx-auto h-10 w-10" style={{ color: TERRA }} />
        <p className="mt-4 font-display text-xl font-black" style={{ color: INK }}>Você ainda não enviou nenhuma dúvida</p>
        <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>Comece pela aba <strong>Nova Dúvida</strong> — a professora está esperando.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="mine-list">
      {items.map((d) => (
        <MineCard
          key={d.id}
          d={d}
          categories={categories}
          expanded={expanded === d.id}
          onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

function MineCard({ d, expanded, onToggle, onRefresh, categories }) {
  const st = STATUS_LABEL[d.status] || STATUS_LABEL.aguardando;
  const StIcon = st.icon;
  const catLabel = categories?.find((c) => c.id === d.category)?.label || d.category;
  const isUnreadAnswer = d.status === "respondida" && !d.read_by_student;
  const [publishing, setPublishing] = useState(false);

  const handleMarkRead = async () => {
    try { await api.post(`/plantao/duvidas/${d.id}/mark-read`); onRefresh && onRefresh(); } catch {}
  };
  const handlePublish = async (val) => {
    setPublishing(true);
    try {
      await api.post(`/plantao/duvidas/${d.id}/publish`, { is_public: val });
      toast.success(val ? "Sua dúvida agora ajuda outras alunas 💛" : "Sua dúvida ficará privada.");
      onRefresh && onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Não foi possível atualizar.");
    } finally { setPublishing(false); }
  };

  return (
    <div
      data-testid={`mine-card-${d.id}`}
      className="rounded-2xl border transition-all"
      style={{
        borderColor: isUnreadAnswer ? HONEY : BORDER,
        background: "#FFFDF9",
        boxShadow: isUnreadAnswer ? "0 6px 24px rgba(216,154,91,0.20)" : "0 1px 2px rgba(46,27,18,0.04)",
      }}
    >
      <button
        onClick={() => { onToggle(); if (isUnreadAnswer) handleMarkRead(); }}
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background: st.bg, color: st.color }}
            >
              <StIcon className="h-3 w-3" /> {st.label}
            </span>
            {catLabel && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: CREAM_2, color: TERRA_DARK }}>
                {catLabel}
              </span>
            )}
            {isUnreadAnswer && (
              <span className="animate-pulse rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white" style={{ background: HONEY }}>
                Nova resposta
              </span>
            )}
          </div>
          <p className="mt-2 font-display text-lg font-black" style={{ color: INK }}>{d.subject}</p>
          <p className="mt-1 line-clamp-2 text-[13px]" style={{ color: INK_MUTED }}>{d.question}</p>
        </div>
        {expanded ? <ChevronUp className="mt-1 h-5 w-5 shrink-0" style={{ color: TERRA_DARK }} /> : <ChevronDown className="mt-1 h-5 w-5 shrink-0" style={{ color: TERRA_DARK }} />}
      </button>

      {expanded && (
        <div className="border-t px-5 py-5" style={{ borderColor: BORDER }}>
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Sua pergunta</p>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: INK }}>{d.question}</p>
          </div>

          {d.status === "respondida" && d.answer ? (
            <div className="rounded-2xl border p-4" style={{ background: CREAM, borderColor: BORDER }}>
              <div className="mb-2 flex items-center gap-2">
                <ChefHat className="h-4 w-4" style={{ color: TERRA_DARK }} />
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Resposta da Professora</p>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: INK }}>{d.answer}</p>

              <div className="mt-5 rounded-xl border p-4" style={{ borderColor: BORDER, background: "#FFFDF9" }}>
                <p className="text-sm font-bold" style={{ color: INK }}>Deseja compartilhar esta dúvida com outras alunas?</p>
                <p className="mt-1 text-[12px]" style={{ color: INK_MUTED }}>
                  Nenhum dado seu (nome, email ou foto) será exibido. Apenas o título, sua pergunta e a resposta da professora.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    data-testid={`publish-yes-${d.id}`}
                    onClick={() => handlePublish(true)}
                    disabled={publishing}
                    className="rounded-full font-bold text-white"
                    style={{ background: d.is_public ? SAGE : "#4E7A3E" }}
                  >
                    <Globe2 className="mr-2 h-4 w-4" /> {d.is_public ? "Está pública ✓" : "Tornar pública"}
                  </Button>
                  <Button
                    data-testid={`publish-no-${d.id}`}
                    onClick={() => handlePublish(false)}
                    disabled={publishing}
                    variant="outline"
                    className="rounded-full border font-bold"
                    style={{ borderColor: BORDER, color: INK }}
                  >
                    <Lock className="mr-2 h-4 w-4" /> {!d.is_public ? "Está privada ✓" : "Manter privada"}
                  </Button>
                </div>
                {d.is_public && (
                  <div className="mt-3 flex items-center gap-4 text-[12px]" style={{ color: INK_MUTED }}>
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {d.views || 0} visualizações</span>
                    <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {d.likes || 0} curtidas</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border p-4 text-center" style={{ borderColor: BORDER, background: CREAM }}>
              <Clock3 className="mx-auto h-6 w-6" style={{ color: HONEY }} />
              <p className="mt-2 text-sm font-semibold" style={{ color: INK }}>Aguardando resposta da professora</p>
              <p className="mt-1 text-[12px]" style={{ color: INK_MUTED }}>Enviada em {new Date(d.created_at).toLocaleString("pt-BR")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Biblioteca (Perguntas da Comunidade) ---------- */
function BiblioSection({ data, categories, refresh }) {
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [sort, setSort] = useState("recent");
  const [items, setItems] = useState(data?.items || []);
  const [searching, setSearching] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { setItems(data?.items || []); }, [data]);

  useEffect(() => {
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (activeCat) params.category = activeCat;
    if (sort) params.sort = sort;
    setSearching(true);
    const t = setTimeout(() => {
      api.get("/plantao/library", { params })
        .then((r) => setItems(r.data.items || []))
        .finally(() => setSearching(false));
    }, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, activeCat, sort]);

  const openDetail = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try {
      const { data: doc } = await api.get(`/plantao/library/${id}`);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...doc } : it)));
    } catch {}
  };

  const like = async (id) => {
    try {
      await api.post(`/plantao/library/${id}/like`);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, likes: (it.likes || 0) + 1 } : it)));
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Barra de busca — sem "caixa", só o input com filtros embaixo */}
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: INK_MUTED }} />
            <Input
              data-testid="library-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquise por assunto, pergunta ou palavra-chave…"
              className="h-12 border-[#EED3C3] bg-white pl-9 text-[15px]"
            />
          </div>
          <select
            data-testid="library-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-12 rounded-md border px-3 text-sm font-semibold"
            style={{ borderColor: BORDER, background: "#fff", color: INK }}
          >
            <option value="recent">Mais recentes</option>
            <option value="popular">Mais acessadas</option>
            <option value="liked">Mais curtidas</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" data-testid="library-cat-list">
          <FilterChip active={activeCat === ""} onClick={() => setActiveCat("")}>
            <Filter className="h-3 w-3" /> Todas
          </FilterChip>
          {categories?.map((c) => (
            <FilterChip
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
              count={data?.counts_by_category?.[c.id] || 0}
              testId={`library-cat-${c.id}`}
            >
              {c.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Lista única, sem duplicação */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <p className="font-display text-lg font-black" style={{ color: INK }}>
            {q || activeCat ? "Resultados da sua busca" :
              sort === "popular" ? "Mais acessadas pelas alunas" :
              sort === "liked" ? "Mais curtidas pelas alunas" :
              "Perguntas recentes"}
          </p>
          {searching && <Loader2 className="h-4 w-4 animate-spin" style={{ color: TERRA }} />}
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen className="mx-auto h-8 w-8" style={{ color: HONEY }} />
            <p className="mt-3 font-semibold" style={{ color: INK }}>Nada por aqui ainda.</p>
            <p className="mt-1 text-sm" style={{ color: INK_MUTED }}>
              Assim que uma aluna liberar sua dúvida respondida, ela aparece aqui pra todas.
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: BORDER }} data-testid="library-list">
            {items.map((it) => (
              <li key={it.id} style={{ borderColor: BORDER }} className="border-t first:border-t-0">
                <PublicRow it={it} onOpen={openDetail} expanded={expandedId === it.id} onLike={() => like(it.id)} categories={categories} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children, count, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all"
      style={{
        borderColor: active ? TERRA : BORDER,
        background: active ? TERRA : "#fff",
        color: active ? "#fff" : INK,
      }}
    >
      {children}
      {typeof count === "number" && count > 0 && (
        <span className="ml-1 rounded-full px-1.5 text-[10px] font-black" style={{ background: active ? "rgba(255,255,255,0.25)" : CREAM_2, color: active ? "#fff" : TERRA_DARK }}>
          {count}
        </span>
      )}
    </button>
  );
}

function PublicRow({ it, onOpen, expanded, onLike, categories }) {
  const catLabel = categories?.find((c) => c.id === it.category)?.label || it.category;
  return (
    <div data-testid={`public-card-${it.id}`}>
      <button onClick={() => onOpen(it.id)} className="flex w-full items-start justify-between gap-3 py-4 text-left transition-colors hover:bg-white/40 rounded-lg px-2 -mx-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold leading-snug" style={{ color: INK }}>{it.subject}</p>
          <p className="mt-1 line-clamp-2 text-[13px]" style={{ color: INK_MUTED }}>{it.question}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: INK_MUTED }}>
            {catLabel && (
              <span className="font-semibold" style={{ color: TERRA_DARK }}>{catLabel}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> {it.views || 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {it.likes || 0}
            </span>
            {it.answered_at && (
              <span>{new Date(it.answered_at).toLocaleDateString("pt-BR")}</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="mt-1 h-5 w-5 shrink-0" style={{ color: TERRA_DARK }} /> : <ChevronDown className="mt-1 h-5 w-5 shrink-0" style={{ color: TERRA_DARK }} />}
      </button>

      {expanded && (
        <div className="pb-5 pl-2 pr-2 -mx-2">
          <div className="mb-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Pergunta completa</p>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: INK }}>{it.question}</p>
          </div>
          <div className="border-l-2 pl-4" style={{ borderColor: HONEY }}>
            <div className="mb-2 flex items-center gap-2">
              <ChefHat className="h-4 w-4" style={{ color: TERRA_DARK }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Resposta da Professora</p>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: INK }}>{it.answer}</p>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <button
              data-testid={`like-btn-${it.id}`}
              onClick={onLike}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold transition-colors hover:opacity-70"
              style={{ color: TERRA_DARK }}
            >
              <Heart className="h-3.5 w-3.5" /> Curtir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotLoggedIn() {
  return (
    <div
      data-testid="not-logged-plantao"
      className="mx-auto max-w-lg rounded-3xl border p-8 text-center"
      style={{ borderColor: BORDER, background: "#FFFDF9" }}
    >
      <div
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${TERRA} 0%, ${TERRA_DARK} 100%)` }}
      >
        <MessageCircleHeart className="h-7 w-7" strokeWidth={2.2} />
      </div>
      <h2 className="mt-5 font-display text-2xl font-black" style={{ color: INK }}>
        Entre para falar com a professora
      </h2>
      <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>
        O Plantão de Dúvidas é o espaço em que sua pergunta vira uma conversa
        e, se você quiser, também vira conhecimento vivo para outras alunas.
      </p>
    </div>
  );
}
