import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, BRL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2, Pencil, Sparkles, ChefHat, Target, BookOpen, Users, Flame,
  Store, MapPin, DollarSign, Trophy, ArrowRight, LogOut, Award, Crown,
  BarChart3, HeartHandshake, Package, NotebookPen, Palette, Calculator,
  ShieldCheck, ChevronRight, Lock, PartyPopper,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// Paleta do Cozinha Lucrativa
const TERRA = "#A24D2A";
const TERRA_DARK = "#8A3F21";
const CREAM = "#FAF6F0";
const CREAM_2 = "#F4E1D5";
const BORDER = "#EED3C3";
const INK = "#2E1B12";
const INK_MUTED = "#5F4A3F";
const HONEY = "#D89A5B";
const PEACH = "#F5B98A";

const SPECIALTIES = [
  { value: "bolos-caseiros", label: "Bolos Caseiros", emoji: "🍰" },
  { value: "confeitaria-fina", label: "Confeitaria Fina", emoji: "🎂" },
  { value: "brigadeiro-gourmet", label: "Brigadeiro Gourmet", emoji: "🍫" },
  { value: "salgados", label: "Salgados", emoji: "🥟" },
  { value: "geladinhos-picoles", label: "Geladinhos & Picolés", emoji: "🍦" },
  { value: "iogurtes-gourmet", label: "Iogurtes Gourmet", emoji: "🥛" },
  { value: "hamburgueria", label: "Hamburgueria", emoji: "🍔" },
  { value: "marmitas", label: "Marmitas & Comida Caseira", emoji: "🍲" },
  { value: "outra", label: "Outra especialidade", emoji: "🍴" },
];

const specialtyLabel = (v) => SPECIALTIES.find((s) => s.value === v)?.label || v || "Ainda não definido";
const specialtyEmoji = (v) => SPECIALTIES.find((s) => s.value === v)?.emoji || "🍴";

// ==================== Sub-components ====================

function Card({ children, className = "", testId }) {
  return (
    <div
      data-testid={testId}
      className={`rounded-2xl border bg-white/70 backdrop-blur-sm shadow-[0_1px_2px_rgba(46,27,18,0.04)] ${className}`}
      style={{ borderColor: BORDER }}
    >
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint, tone = "terra", testId }) {
  const tones = {
    terra: { bg: "#FFF3EA", ring: TERRA, iconBg: TERRA },
    honey: { bg: "#FFF6E6", ring: HONEY, iconBg: HONEY },
    olive: { bg: "#F1F0DE", ring: "#7A8556", iconBg: "#7A8556" },
    peach: { bg: "#FFEDDC", ring: PEACH, iconBg: "#D97F3B" },
  };
  const t = tones[tone] || tones.terra;
  return (
    <div
      data-testid={testId}
      className="flex items-start gap-4 rounded-2xl border p-5"
      style={{ backgroundColor: t.bg, borderColor: BORDER }}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm"
        style={{ backgroundColor: t.iconBg }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.3} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: INK_MUTED }}>{label}</div>
        <div className="mt-1 font-display text-3xl font-black leading-none" style={{ color: INK }}>{value}</div>
        {hint && <div className="mt-1 text-xs" style={{ color: INK_MUTED }}>{hint}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" style={{ color: TERRA_DARK }} strokeWidth={2.4} />}
        <h3 className="font-display text-base font-black tracking-tight" style={{ color: INK }}>{children}</h3>
      </div>
      {action}
    </div>
  );
}

function LinkRow({ to, icon: Icon, title, subtitle, testId, locked = false, onLockedClick }) {
  const navigate = useNavigate();
  return (
    <button
      data-testid={testId}
      onClick={() => (locked ? onLockedClick?.() : navigate(to))}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#F4E1D5]/60"
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: locked ? "#EED3C3" : CREAM_2, color: locked ? INK_MUTED : TERRA_DARK }}
      >
        {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={2.2} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold leading-tight" style={{ color: INK }}>{title}</div>
        <div className="text-xs" style={{ color: INK_MUTED }}>{subtitle}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-80" style={{ color: TERRA_DARK }} />
    </button>
  );
}

function ProgressBar({ value, tone = TERRA }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: CREAM_2 }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tone} 0%, ${TERRA_DARK} 100%)` }}
      />
    </div>
  );
}

// ==================== Edit modal ====================

function EditProfileModal({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    city: "",
    specialty: "",
    monthly_goal: 0,
    favorite_dish: "",
    motto: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        city: initial?.city || "",
        specialty: initial?.specialty || "",
        monthly_goal: initial?.monthly_goal || 0,
        favorite_dish: initial?.favorite_dish || "",
        motto: initial?.motto || "",
      });
    }
  }, [open, initial]);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Coloca o seu nome para a gente te chamar direito 💛");
      return;
    }
    setSaving(true);
    try {
      await api.put("/profile/me", form);
      toast.success("Perfil atualizado!");
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Não deu para salvar. Tenta de novo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent
        data-testid="edit-profile-modal"
        className="max-w-lg border-[#EED3C3] bg-[#FAF6F0]"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black" style={{ color: INK }}>
            Editar meu perfil
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: INK_MUTED }}>
            Personalize seu espaço com seus dados de negócio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="p-name" className="text-xs font-semibold" style={{ color: INK }}>Como você quer ser chamada</Label>
            <Input
              id="p-name"
              data-testid="profile-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Carine"
              className="mt-1 border-[#EED3C3] bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-city" className="text-xs font-semibold" style={{ color: INK }}>Cidade</Label>
              <Input
                id="p-city"
                data-testid="profile-city-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Ex.: São Paulo"
                className="mt-1 border-[#EED3C3] bg-white"
              />
            </div>
            <div>
              <Label htmlFor="p-goal" className="text-xs font-semibold" style={{ color: INK }}>Meta mensal (R$)</Label>
              <Input
                id="p-goal"
                data-testid="profile-goal-input"
                type="number"
                min="0"
                value={form.monthly_goal}
                onChange={(e) => setForm({ ...form, monthly_goal: e.target.value })}
                placeholder="Ex.: 3000"
                className="mt-1 border-[#EED3C3] bg-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold" style={{ color: INK }}>Sua especialidade</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SPECIALTIES.map((s) => {
                const active = form.specialty === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    data-testid={`profile-specialty-${s.value}`}
                    onClick={() => setForm({ ...form, specialty: s.value })}
                    className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                    style={active
                      ? { backgroundColor: TERRA, borderColor: TERRA, color: "#fff" }
                      : { backgroundColor: "#fff", borderColor: BORDER, color: INK }}
                  >
                    <span className="mr-1">{s.emoji}</span>{s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="p-dish" className="text-xs font-semibold" style={{ color: INK }}>Produto que você mais vende (opcional)</Label>
            <Input
              id="p-dish"
              data-testid="profile-dish-input"
              value={form.favorite_dish}
              onChange={(e) => setForm({ ...form, favorite_dish: e.target.value })}
              placeholder="Ex.: Bolo de cenoura com brigadeiro"
              className="mt-1 border-[#EED3C3] bg-white"
            />
          </div>
          <div>
            <Label htmlFor="p-motto" className="text-xs font-semibold" style={{ color: INK }}>Uma frase que te representa (opcional)</Label>
            <Input
              id="p-motto"
              data-testid="profile-motto-input"
              value={form.motto}
              onChange={(e) => setForm({ ...form, motto: e.target.value })}
              placeholder="Ex.: Doces feitos com receita da avó"
              className="mt-1 border-[#EED3C3] bg-white"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            data-testid="edit-profile-cancel"
            variant="outline"
            onClick={onClose}
            className="border-[#EED3C3] bg-white text-[#2E1B12] hover:bg-[#F4E1D5]"
          >
            Cancelar
          </Button>
          <Button
            data-testid="edit-profile-save"
            onClick={save}
            disabled={saving}
            className="rounded-full px-6 font-semibold text-white"
            style={{ backgroundColor: TERRA }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== First-time onboarding empty state ====================

function EmptyProfile({ onOpen }) {
  return (
    <Card testId="profile-empty" className="p-8 md:p-10">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${TERRA} 0%, ${TERRA_DARK} 100%)` }}>
          <ChefHat className="h-8 w-8" strokeWidth={2.2} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-black leading-tight" style={{ color: INK }}>
          Vamos deixar o app com a sua cara?
        </h2>
        <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>
          Preenche 3 informações rapidinho — cidade, especialidade e meta do mês —
          para desbloquear o seu painel completo com suas conquistas e evolução.
        </p>
        <Button
          data-testid="profile-empty-cta"
          onClick={onOpen}
          className="mt-6 rounded-full px-8 py-6 font-bold text-white shadow-[0_6px_20px_rgba(162,77,42,0.35)]"
          style={{ backgroundColor: TERRA }}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Preencher meu perfil
        </Button>
      </div>
    </Card>
  );
}

// ==================== Main page ====================

export default function Perfil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    try {
      const [{ data: p }, { data: s }] = await Promise.all([
        api.get("/profile/me"),
        api.get("/profile/stats"),
      ]);
      setProfileData(p);
      setStats(s);
    } catch (e) {
      // BETA_MODE: acesso pode não estar autenticado; mostra estado vazio
      setProfileData(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const displayName = profileData?.user?.name || user?.name || "Confeiteira";
  const firstName = (displayName || "").split(" ")[0];
  const picture = profileData?.user?.picture || user?.picture;
  const profile = profileData?.profile || {};
  const store = profileData?.store;
  const isComplete = !!profileData?.profile_complete;

  const kpis = stats?.kpis || {};
  const chartData = stats?.chart_30d || [];
  const chartFormatted = useMemo(() => chartData.map((d) => ({
    date: d.date.slice(5), // MM-DD
    entregues: d.entregues,
    faturamento: d.faturamento,
  })), [chartData]);

  const goalPct = stats && stats.meta_mensal > 0
    ? Math.min(100, Math.round((stats.faturamento_mes / stats.meta_mensal) * 100))
    : 0;

  const missionsPct = stats
    ? Math.round(((stats.missoes_concluidas || 0) / (stats.missoes_total || 8)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:px-8">
        <ChefHat className="mx-auto h-12 w-12" style={{ color: TERRA }} />
        <h1 className="mt-4 font-display text-2xl font-black" style={{ color: INK }}>Entra para ver seu perfil</h1>
        <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>Seu perfil guarda suas conquistas, evolução e ajustes do app.</p>
      </div>
    );
  }

  // ==== First-time empty state ====
  if (!isComplete) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14" style={{ color: INK }}>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-black tracking-tight" style={{ color: INK }}>Meu Perfil</h1>
            <Sparkles className="h-5 w-5" style={{ color: HONEY }} />
          </div>
          <p className="mt-1 text-sm" style={{ color: INK_MUTED }}>
            Este é o seu espaço, {firstName}. Vamos configurar em menos de 1 minuto.
          </p>
        </div>
        <EmptyProfile onOpen={() => setModalOpen(true)} />
        <EditProfileModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initial={{ ...profile, name: displayName }}
          onSaved={load}
        />
      </div>
    );
  }

  // ==== Completed profile — full dashboard ====
  return (
    <div data-testid="perfil-page" className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12" style={{ color: INK }}>
      {/* Title */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl" style={{ color: INK }}>
              Meu Perfil
            </h1>
            <Sparkles className="h-6 w-6" style={{ color: HONEY }} />
          </div>
          <p className="mt-1 text-sm" style={{ color: INK_MUTED }}>
            Este é o seu espaço. Acompanhe sua jornada e evolua todos os dias.
          </p>
        </div>
      </div>

      {/* Identity card */}
      <Card testId="perfil-identity" className="mb-5 p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              {picture ? (
                <img
                  src={picture}
                  alt=""
                  className="h-20 w-20 rounded-2xl object-cover shadow-sm"
                  style={{ border: `3px solid ${CREAM_2}` }}
                />
              ) : (
                <div
                  className="grid h-20 w-20 place-items-center rounded-2xl text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${TERRA} 0%, ${TERRA_DARK} 100%)`, border: `3px solid ${CREAM_2}` }}
                >
                  <ChefHat className="h-9 w-9" strokeWidth={2.2} />
                </div>
              )}
              {stats?.journey_completed_at && (
                <div
                  title="Empreendedora Renda Lucrativa"
                  className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow"
                >
                  <Crown className="h-3.5 w-3.5" strokeWidth={2.8} />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-black leading-none" style={{ color: INK }}>{firstName}</h2>
                <button
                  data-testid="edit-profile-btn"
                  onClick={() => setModalOpen(true)}
                  className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-[#F4E1D5]"
                  title="Editar perfil"
                >
                  <Pencil className="h-3.5 w-3.5" style={{ color: TERRA_DARK }} />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: INK_MUTED }}>
                <span className="flex items-center gap-1">
                  <Store className="h-3.5 w-3.5" /> {store?.store_name || "Sua loja"}
                </span>
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {profile.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  {specialtyEmoji(profile.specialty)} {specialtyLabel(profile.specialty)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: "#FFF6E6", borderColor: HONEY, color: TERRA_DARK }}
                >
                  <Crown className="h-3 w-3" /> Plano Beta · Todos os cursos liberados
                </span>
                {profile.favorite_dish && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: CREAM_2, borderColor: BORDER, color: INK }}
                  >
                    🍽️ {profile.favorite_dish}
                  </span>
                )}
              </div>
              {profile.motto && (
                <p className="mt-3 flex items-start gap-2 text-sm italic" style={{ color: TERRA_DARK }}>
                  <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>“{profile.motto}”</span>
                </p>
              )}
            </div>
          </div>

          {/* Meta card */}
          <div
            className="w-full rounded-2xl border p-4 md:w-80"
            style={{ backgroundColor: "#FFF3EA", borderColor: BORDER }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>
                <Target className="h-3.5 w-3.5" /> Meta do mês
              </div>
              <button
                data-testid="edit-goal-btn"
                onClick={() => setModalOpen(true)}
                className="text-xs font-semibold underline-offset-2 hover:underline"
                style={{ color: TERRA_DARK }}
              >
                Editar
              </button>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-display text-3xl font-black leading-none" style={{ color: INK }}>
                {BRL(stats?.faturamento_mes || 0)}
              </span>
              <span className="pb-0.5 text-xs" style={{ color: INK_MUTED }}>
                / {BRL(stats?.meta_mensal || 0)}
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={goalPct} />
              <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: INK_MUTED }}>
                <span>{goalPct}% da meta</span>
                <span>{goalPct >= 100 ? "🎉 Meta batida!" : "Continua firme"}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Row */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={BookOpen}
          label="Cursos concluídos"
          value={kpis.cursos_concluidos ?? 0}
          hint={`${kpis.cursos_matriculados ?? 0} matriculados`}
          tone="terra"
          testId="kpi-cursos"
        />
        <KpiCard
          icon={Sparkles}
          label="Aulas assistidas"
          value={kpis.aulas_assistidas ?? 0}
          hint={kpis.aulas_assistidas > 0 ? "Continue avançando 👏" : "Comece por qualquer curso"}
          tone="honey"
          testId="kpi-aulas"
        />
        <KpiCard
          icon={Users}
          label="Clientes atendidos"
          value={kpis.clientes_atendidos ?? 0}
          hint={`${kpis.pedidos_entregues ?? 0} pedidos entregues`}
          tone="peach"
          testId="kpi-clientes"
        />
        <KpiCard
          icon={Flame}
          label="Sequência estudando"
          value={`${kpis.streak_dias ?? 0} dias`}
          hint={kpis.streak_dias > 0 ? "Mantenha o ritmo" : "Comece hoje 🔥"}
          tone="olive"
          testId="kpi-streak"
        />
      </div>

      {/* Chart + Journey */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2" testId="perfil-chart">
          <SectionTitle icon={BarChart3}>Vendas nos últimos 30 dias</SectionTitle>
          {chartFormatted.length === 0 || chartFormatted.every((d) => d.entregues === 0) ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="h-8 w-8" style={{ color: HONEY }} />
              <p className="mt-3 text-sm" style={{ color: INK_MUTED }}>
                Ainda não há pedidos entregues nos últimos 30 dias.
              </p>
              <Button
                data-testid="chart-empty-cta"
                onClick={() => navigate("/encomendas")}
                variant="outline"
                className="mt-3 rounded-full border-[#EED3C3] bg-white text-sm font-semibold text-[#2E1B12] hover:bg-[#F4E1D5]"
              >
                Registrar meu primeiro pedido <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartFormatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EED3C3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: INK_MUTED }} tickMargin={6} />
                  <YAxis tick={{ fontSize: 10, fill: INK_MUTED }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 12 }}
                    formatter={(v, name) => name === "faturamento" ? [BRL(v), "Faturamento"] : [v, "Pedidos"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="entregues"
                    stroke={TERRA}
                    strokeWidth={2.5}
                    dot={{ fill: TERRA, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5" testId="perfil-journey">
          <SectionTitle icon={Trophy}>Minha Jornada</SectionTitle>
          <div className="mt-1">
            <div className="flex items-end gap-2">
              <span className="font-display text-3xl font-black leading-none" style={{ color: INK }}>
                {stats?.missoes_concluidas ?? 0}
              </span>
              <span className="pb-0.5 text-xs" style={{ color: INK_MUTED }}>
                / {stats?.missoes_total ?? 8} missões
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={missionsPct} tone={HONEY} />
              <div className="mt-1.5 text-xs" style={{ color: INK_MUTED }}>
                {stats?.journey_completed_at
                  ? "🏆 Jornada completa!"
                  : "Cada missão te aproxima dos R$ 10k/mês"}
              </div>
            </div>

            {stats?.current_course && (
              <div className="mt-4 rounded-xl border p-3" style={{ backgroundColor: CREAM, borderColor: BORDER }}>
                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TERRA_DARK }}>
                  Continue de onde parou
                </div>
                <div className="mt-1 text-sm font-bold leading-tight" style={{ color: INK }}>
                  {stats.current_course.title}
                </div>
                <div className="mt-2">
                  <ProgressBar value={stats.current_course.progress} />
                  <div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: INK_MUTED }}>
                    <span>{stats.current_course.progress}% concluído</span>
                    <button
                      data-testid="continue-course-btn"
                      onClick={() => navigate(`/curso/${stats.current_course.slug}/modulos`)}
                      className="font-semibold underline-offset-2 hover:underline"
                      style={{ color: TERRA_DARK }}
                    >
                      Retomar →
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Button
              data-testid="go-jornada-btn"
              onClick={() => navigate("/jornada")}
              className="mt-4 w-full rounded-full font-semibold text-white"
              style={{ backgroundColor: TERRA }}
            >
              Ver minhas missões
            </Button>
          </div>
        </Card>
      </div>

      {/* Conquistas grid */}
      <Card className="mb-5 p-5" testId="perfil-conquistas">
        <SectionTitle icon={Award} action={
          <button
            data-testid="conquistas-ver-todas"
            onClick={() => navigate("/jornada")}
            className="text-xs font-semibold underline-offset-2 hover:underline"
            style={{ color: TERRA_DARK }}
          >
            Ver todas
          </button>
        }>
          Conquistas
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
          <AchievementBadge active={(kpis.cursos_concluidos ?? 0) >= 1} icon="🎓" label="1º Curso" hint="Concluir 1 curso" />
          <AchievementBadge active={(kpis.pedidos_entregues ?? 0) >= 1} icon="📦" label="Primeira Venda" hint="1 pedido entregue" />
          <AchievementBadge active={(kpis.clientes_atendidos ?? 0) >= 10} icon="⭐" label="10 Clientes" hint="Base fiel" />
          <AchievementBadge active={(kpis.streak_dias ?? 0) >= 7} icon="🔥" label="7 dias" hint="Sequência semanal" />
          <AchievementBadge active={(stats?.faturamento_mes || 0) >= 1000} icon="💎" label="R$ 1k/mês" hint="Meta inicial" />
        </div>
      </Card>

      {/* 3 columns of quick links */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-4" testId="perfil-menu-aprender">
          <SectionTitle icon={BookOpen}>Aprender</SectionTitle>
          <div className="space-y-1">
            <LinkRow to="/meus-cursos" icon={BookOpen} title="Meus cursos" subtitle="Continuar de onde parei" testId="link-meus-cursos" />
            <LinkRow to="/minhas-anotacoes" icon={NotebookPen} title="Meu caderno" subtitle="Anotações e ideias" testId="link-caderno" />
            <LinkRow to="/materiais" icon={Palette} title="Kits de marketing" subtitle="Cartões, rótulos e mídia" testId="link-materiais" />
            <LinkRow to="/bonus-extra" icon={PartyPopper} title="Bônus extras" subtitle="Materiais liberados" testId="link-bonus" />
          </div>
        </Card>

        <Card className="p-4" testId="perfil-menu-negocio">
          <SectionTitle icon={DollarSign}>Meu negócio</SectionTitle>
          <div className="space-y-1">
            <LinkRow to="/minha-vitrine" icon={Store} title="Minha loja virtual" subtitle={store?.slug ? `/vitrine/${store.slug}` : "Configurar loja"} testId="link-vitrine" />
            <LinkRow to="/encomendas" icon={Package} title="Encomendas" subtitle={`${stats?.orders_count ?? 0} pedidos registrados`} testId="link-encomendas" />
            <LinkRow to="/calculadora" icon={Calculator} title="Calculadora de lucro" subtitle="Precifica seus produtos" testId="link-calculadora" />
            <LinkRow to="/jornada" icon={Trophy} title="Missões e desafios" subtitle={`${stats?.missoes_concluidas ?? 0}/${stats?.missoes_total ?? 8} concluídas`} testId="link-jornada" />
          </div>
        </Card>

        <Card className="p-4" testId="perfil-menu-conta">
          <SectionTitle icon={ShieldCheck}>Minha conta</SectionTitle>
          <div className="space-y-1">
            <LinkRow to="#" icon={Pencil} title="Meus dados" subtitle="Editar nome, cidade, meta" testId="link-editar-perfil" locked onLockedClick={() => setModalOpen(true)} />
            <LinkRow to="/termos" icon={ShieldCheck} title="Termos e privacidade" subtitle="Como cuidamos dos seus dados" testId="link-termos" />
            <LinkRow to="/privacidade" icon={ShieldCheck} title="Privacidade" subtitle="LGPD e transparência" testId="link-privacidade" />
            <button
              data-testid="link-logout"
              onClick={logout}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-red-50"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                <LogOut className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold leading-tight text-red-800">Sair da conta</div>
                <div className="text-xs text-red-800/70">Até logo 👋</div>
              </div>
            </button>
          </div>
        </Card>
      </div>

      <div className="pb-4 text-center text-xs" style={{ color: INK_MUTED }}>
        Seus dados ficam seguros e anônimos · LGPD
      </div>

      <EditProfileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={{ ...profile, name: displayName }}
        onSaved={load}
      />
    </div>
  );
}

// ==================== Achievement badge ====================

function AchievementBadge({ active, icon, label, hint }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border p-3 text-center transition-transform hover:-translate-y-0.5"
      style={{
        backgroundColor: active ? "#FFF6E6" : "#F5EFE6",
        borderColor: active ? HONEY : BORDER,
        opacity: active ? 1 : 0.65,
      }}
    >
      <div
        className="grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-sm"
        style={{
          backgroundColor: active ? "#FFF" : "#EED3C3",
          filter: active ? "none" : "grayscale(0.5)",
        }}
      >
        {active ? icon : <Lock className="h-4 w-4" style={{ color: INK_MUTED }} />}
      </div>
      <div className="mt-2 text-xs font-black leading-tight" style={{ color: INK }}>{label}</div>
      <div className="mt-0.5 text-[10px] leading-tight" style={{ color: INK_MUTED }}>{hint}</div>
    </div>
  );
}
