import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ChefHat, Loader2, ArrowLeft, MessageCircleHeart, Clock3, CheckCircle2,
  Send, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";

const TERRA = "#A24D2A";
const TERRA_DARK = "#8A3F21";
const CREAM = "#FAF6F0";
const CREAM_2 = "#F4E1D5";
const BORDER = "#EED3C3";
const INK = "#2E1B12";
const INK_MUTED = "#5F4A3F";
const HONEY = "#D89A5B";

export default function PlantaoAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ pending: [], answered: [], categories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/plantao/me").then((r) => setMe(r.data)).catch(() => setMe({ authenticated: false, is_admin: false }));
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/plantao/admin/queue");
      setData(d);
    } catch (e) {
      // 403 handled below
    } finally { setLoading(false); }
  };
  useEffect(() => { if (me?.is_admin) refresh(); }, [me?.is_admin]);

  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" style={{ background: CREAM }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} />
      </div>
    );
  }

  if (!me.authenticated || !me.is_admin) {
    return (
      <div className="min-h-[70vh]" style={{ background: CREAM }}>
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${TERRA} 0%, ${TERRA_DARK} 100%)` }}>
            <ChefHat className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-black" style={{ color: INK }}>Área restrita à professora</h1>
          <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>
            Este painel é exclusivo para a mentora responder as dúvidas da turma.
          </p>
          <Button className="mt-6 rounded-full font-bold text-white" style={{ background: TERRA }} onClick={() => navigate("/plantao")}>
            Voltar ao Plantão
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]" style={{ background: CREAM }}>
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14" style={{ color: INK }}>
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70"
          style={{ color: TERRA_DARK }}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="mb-8 flex items-start gap-4">
          <div
            className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg sm:grid"
            style={{ background: `linear-gradient(135deg, ${TERRA} 0%, ${TERRA_DARK} 100%)` }}
          >
            <MessageCircleHeart className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] flex items-center gap-1.5" style={{ color: TERRA_DARK }}>
              <Sparkles className="h-3 w-3" /> painel da professora
            </p>
            <h1 className="font-display text-3xl font-black" style={{ color: INK }}>Plantão · Central de Respostas</h1>
            <p className="mt-1 text-sm" style={{ color: INK_MUTED }}>Responda com carinho — cada resposta pode virar conhecimento para todas.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="mb-6 h-auto w-full flex-wrap gap-1 rounded-full border p-1" style={{ background: "#FFFDF9", borderColor: BORDER }}>
              <TabsTrigger value="pending" data-testid="admin-tab-pending" className="flex-1 rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-[#A24D2A] data-[state=active]:text-white" style={{ color: INK }}>
                <Clock3 className="mr-1.5 h-4 w-4" /> Aguardando ({data.pending?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="done" data-testid="admin-tab-done" className="flex-1 rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-[#A24D2A] data-[state=active]:text-white" style={{ color: INK }}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Respondidas ({data.answered?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {(data.pending || []).length === 0 ? (
                <EmptyBox text="Nenhuma dúvida esperando resposta. 👏" />
              ) : (
                <ul className="space-y-3" data-testid="admin-pending-list">
                  {data.pending.map((d) => (
                    <AdminCard key={d.id} d={d} categories={data.categories || []} onDone={refresh} />
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="done">
              {(data.answered || []).length === 0 ? (
                <EmptyBox text="Ainda sem respostas por aqui." />
              ) : (
                <ul className="space-y-3" data-testid="admin-answered-list">
                  {data.answered.map((d) => (
                    <AdminCard key={d.id} d={d} categories={data.categories || []} onDone={refresh} readOnly />
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="rounded-2xl border p-10 text-center" style={{ borderColor: BORDER, background: "#FFFDF9" }}>
      <p className="text-sm" style={{ color: INK_MUTED }}>{text}</p>
    </div>
  );
}

function AdminCard({ d, categories, onDone, readOnly }) {
  const [open, setOpen] = useState(!readOnly);
  const [answer, setAnswer] = useState(d.answer || "");
  const [category, setCategory] = useState(d.category || "outros");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (answer.trim().length < 5) { toast.error("Escreva uma resposta com pelo menos 5 caracteres."); return; }
    setSaving(true);
    try {
      await api.post(`/plantao/admin/duvidas/${d.id}/answer`, { answer: answer.trim(), category });
      toast.success("Resposta enviada e aluna notificada 💛");
      onDone && onDone();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Não foi possível enviar.");
    } finally { setSaving(false); }
  };

  return (
    <li className="rounded-2xl border" style={{ borderColor: BORDER, background: "#FFFDF9" }} data-testid={`admin-card-${d.id}`}>
      <button className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left" onClick={() => setOpen((o) => !o)}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: d.status === "respondida" ? "#EAF4E1" : "#FCEEDE", color: d.status === "respondida" ? "#4E7A3E" : "#B36C36" }}>
              {d.status === "respondida" ? "Respondida" : "Aguardando"}
            </span>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: CREAM_2, color: TERRA_DARK }}>
              {categories.find((c) => c.id === d.category)?.label || d.category}
            </span>
          </div>
          <p className="mt-2 font-display text-lg font-black" style={{ color: INK }}>{d.subject}</p>
          <p className="mt-1 line-clamp-2 text-[13px]" style={{ color: INK_MUTED }}>{d.question}</p>
        </div>
        {open ? <ChevronUp className="h-5 w-5 shrink-0" style={{ color: TERRA_DARK }} /> : <ChevronDown className="h-5 w-5 shrink-0" style={{ color: TERRA_DARK }} />}
      </button>
      {open && (
        <div className="border-t px-5 py-5" style={{ borderColor: BORDER }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Pergunta completa</p>
            <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: INK }}>{d.question}</p>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Categoria</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => !readOnly && setCategory(c.id)}
                  disabled={readOnly}
                  className="rounded-full border px-3 py-1 text-[12px] font-semibold"
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
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>Resposta</p>
            <Textarea
              data-testid={`admin-answer-input-${d.id}`}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Escreva a resposta com clareza e afeto…"
              className="mt-1 min-h-[180px] resize-y border-[#EED3C3] bg-white text-[15px] leading-relaxed"
              disabled={readOnly || saving}
            />
          </div>
          {!readOnly && (
            <div className="mt-4 flex justify-end">
              <Button
                data-testid={`admin-submit-${d.id}`}
                onClick={submit}
                disabled={saving}
                className="rounded-full px-6 font-bold text-white"
                style={{ background: TERRA }}
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</> : <><Send className="mr-2 h-4 w-4" /> Enviar resposta</>}
              </Button>
            </div>
          )}
          {readOnly && d.answered_at && (
            <p className="mt-3 text-[12px]" style={{ color: INK_MUTED }}>
              Respondida em {new Date(d.answered_at).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
