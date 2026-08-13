import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, BRL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Rocket, Trophy, Sparkles, Loader2, CheckCircle2, Circle,
  ArrowRight, Calendar, TrendingUp, Users, Package, Repeat,
  Wallet, Crown, ChevronDown, Lock, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MISSION_ACCENTS = {
  1: { base: "emerald", label: "Primeira Venda" },
  2: { base: "amber",   label: "Primeiros R$ 1.000" },
  3: { base: "sky",     label: "10 Clientes Felizes" },
  4: { base: "violet",  label: "Negócio Organizado" },
  5: { base: "rose",    label: "Clientes que Voltam" },
  6: { base: "cyan",    label: "Agenda Lotada" },
  7: { base: "amber",   label: "Renda Consistente" },
  8: { base: "amber",   label: "Rumo aos R$ 10.000/mês" },
};

const TONE = {
  emerald: {
    text: "text-emerald-300", ring: "ring-emerald-500/40", border: "border-emerald-500/30",
    bg: "bg-emerald-500/10", fill: "bg-emerald-500", pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    solidText: "text-emerald-950", solid: "bg-emerald-400",
  },
  amber: {
    text: "text-amber-300", ring: "ring-amber-500/40", border: "border-amber-500/30",
    bg: "bg-amber-500/10", fill: "bg-amber-500", pill: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    solidText: "text-amber-950", solid: "bg-amber-400",
  },
  sky: {
    text: "text-sky-300", ring: "ring-sky-500/40", border: "border-sky-500/30",
    bg: "bg-sky-500/10", fill: "bg-sky-500", pill: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    solidText: "text-sky-950", solid: "bg-sky-400",
  },
  violet: {
    text: "text-violet-300", ring: "ring-violet-500/40", border: "border-violet-500/30",
    bg: "bg-violet-500/10", fill: "bg-violet-500", pill: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    solidText: "text-violet-950", solid: "bg-violet-400",
  },
  rose: {
    text: "text-rose-300", ring: "ring-rose-500/40", border: "border-rose-500/30",
    bg: "bg-rose-500/10", fill: "bg-rose-500", pill: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    solidText: "text-rose-950", solid: "bg-rose-400",
  },
  cyan: {
    text: "text-cyan-300", ring: "ring-cyan-500/40", border: "border-cyan-500/30",
    bg: "bg-cyan-500/10", fill: "bg-cyan-500", pill: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    solidText: "text-cyan-950", solid: "bg-cyan-400",
  },
};

function toneOf(missionId) {
  return TONE[MISSION_ACCENTS[missionId]?.base || "emerald"];
}

function ProgressBar({ pct, tone }) {
  const t = TONE[tone] || TONE.emerald;
  const width = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-800">
      <div
        className={`h-full rounded-full transition-all duration-700 ${t.fill}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle, tone = "emerald" }) {
  const t = TONE[tone];
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-black text-stone-50">{value}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-stone-500">{subtitle}</p>}
        </div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${t.bg} ${t.text}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function StageBadge({ stageId, completed, tone }) {
  const t = TONE[tone] || TONE.emerald;
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${completed ? `${t.solid} ${t.solidText} border-transparent` : t.pill}`}>
      {completed ? <CheckCircle2 className="h-3 w-3" /> : <span>Missão {stageId}</span>}
      {completed && <span>Concluída</span>}
    </div>
  );
}

function StepRow({ step, onNavigate, onMark }) {
  const done = !!step.done;
  const cta = step.cta;
  const showCurrent = step.current !== undefined && step.target !== undefined;
  return (
    <div className={`flex items-start gap-3 rounded-xl p-3 transition-all ${done ? "bg-emerald-500/5" : "bg-stone-900/50 hover:bg-stone-900"}`}>
      <div className="mt-0.5">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <Circle className="h-5 w-5 text-stone-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${done ? "text-stone-400 line-through" : "text-stone-100"}`}>{step.label}</p>
        {showCurrent && (
          <p className="mt-0.5 text-[11px] text-stone-500">
            {step.current} de {step.target}
          </p>
        )}
      </div>
      {!done && cta && cta.href && (
        <Button
          data-testid={`journey-step-cta-${step.id}`}
          onClick={() => onNavigate(cta.href)}
          size="sm"
          className="rounded-lg bg-stone-800 text-xs font-bold text-stone-100 hover:bg-stone-700"
        >
          {cta.label} <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      )}
      {!done && step.manual_id && (
        <Button
          data-testid={`journey-step-manual-${step.manual_id}`}
          onClick={() => onMark(step.manual_id)}
          size="sm"
          variant="ghost"
          className="rounded-lg text-xs font-bold text-emerald-300 hover:bg-emerald-500/10"
        >
          Já fiz
        </Button>
      )}
    </div>
  );
}

function MissionCard({ mission, active, locked, onNavigate, onMark, onToggle, expanded }) {
  const tone = MISSION_ACCENTS[mission.id]?.base || "emerald";
  const t = TONE[tone];
  const isCompleted = !!mission.completed;

  return (
    <div
      data-testid={`journey-mission-${mission.id}`}
      className={`overflow-hidden rounded-3xl border transition-all ${
        isCompleted
          ? "border-emerald-500/40 bg-emerald-500/5"
          : active
          ? `border-stone-700 bg-stone-900/70 ring-2 ${t.ring}`
          : locked
          ? "border-stone-800 bg-stone-900/40 opacity-70"
          : "border-stone-800 bg-stone-900/60"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(mission.id)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${t.bg}`}>
          <span>{mission.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stageId={mission.id} completed={isCompleted} tone={tone} />
            {active && !isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-300">
                <Rocket className="h-3 w-3" /> Missão atual
              </span>
            )}
            {locked && !isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-800/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <Lock className="h-3 w-3" /> Chega depois
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-xl font-black text-stone-50">{mission.title}</h3>
          <p className="mt-0.5 text-sm text-stone-400">{mission.objective}</p>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className={`font-bold ${t.text}`}>{mission.progress_label}</span>
              <span className="font-black text-stone-300">{mission.progress_pct}%</span>
            </div>
            <ProgressBar pct={mission.progress_pct} tone={tone} />
          </div>
        </div>
        <ChevronDown className={`ml-2 mt-1 h-5 w-5 shrink-0 text-stone-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-stone-800/70 px-5 pb-5 pt-4 animate-fade-in-up">
          {/* Steps */}
          {Array.isArray(mission.steps) && mission.steps.length > 0 && (
            <div className="space-y-2">
              {mission.steps.map((s) => (
                <StepRow key={s.id} step={s} onNavigate={onNavigate} onMark={onMark} />
              ))}
            </div>
          )}

          {/* Mission 2: money bar with tips */}
          {mission.id === 2 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-stone-300">
              <p>💡 A cada pedido marcado como <b>entregue</b> em <Link to="/encomendas" className="font-bold text-amber-300 underline">Encomendas</Link>, sua barra cresce sozinha. Sem preencher nada.</p>
            </div>
          )}

          {/* Mission 3: mini clients preview */}
          {mission.id === 3 && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-stone-300">
              <p>🎯 Cada cliente distinto com pelo menos <b>1 entrega concluída</b> conta. Registre pedidos em <Link to="/encomendas" className="font-bold text-sky-300 underline">Pedidos</Link>.</p>
            </div>
          )}

          {/* Mission 5: recurring preview */}
          {mission.id === 5 && Array.isArray(mission.recurring_preview) && mission.recurring_preview.length > 0 && (
            <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-rose-300">Já voltaram</p>
              <ul className="space-y-1 text-sm text-stone-200">
                {mission.recurring_preview.map((c, i) => (
                  <li key={`${c.name || "cliente"}-${i}`} className="flex items-center justify-between">
                    <span>{c.name || "Cliente"}</span>
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-300">{c.count}ª compra</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mission 6: weeks calendar */}
          {mission.id === 6 && Array.isArray(mission.weeks) && (
            <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-cyan-300">
                <Calendar className="h-3 w-3" /> últimas 4 semanas
              </div>
              <div className="grid grid-cols-4 gap-2">
                {mission.weeks.map((w, i) => (
                  <div
                    key={w.week_start}
                    className={`rounded-xl border p-3 text-center ${w.ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-stone-800 bg-stone-900"}`}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-stone-500">Semana {i + 1}</p>
                    <p className="mt-1 font-display text-lg font-black text-stone-50">{w.orders}</p>
                    <p className="text-[10px] text-stone-500">pedidos</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-400">Meta: 3+ pedidos entregues em cada semana.</p>
            </div>
          )}

          {/* Mission 7: months bars */}
          {mission.id === 7 && Array.isArray(mission.months) && (
            <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-300">
                <Crown className="h-3 w-3" /> últimos 3 meses
              </div>
              <div className="space-y-2">
                {mission.months.map((m) => (
                  <div key={m.ym} className="flex items-center justify-between rounded-lg bg-stone-900/70 px-3 py-2">
                    <span className="text-sm font-semibold text-stone-100">{m.ym}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-amber-300">{BRL(m.revenue)}</span>
                      {m.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-stone-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed hero */}
          {isCompleted && (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <Award className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
              <p className="font-display text-base font-black text-emerald-200">Missão concluída!</p>
              <p className="text-xs text-stone-400">Continue avançando na próxima etapa 👇</p>
              <Link
                to={`/jornada/certificado/missao/${mission.id}`}
                data-testid={`view-mission-cert-${mission.id}`}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-stone-950 shadow hover:bg-amber-600"
              >
                <Award className="h-3.5 w-3.5" /> Ver certificado
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Jornada() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/journey/status");
      setStatus(data);
      if (!expanded) setExpanded(data.current_stage_id);
    } catch (e) {
      toast.error("Não foi possível carregar sua jornada.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (href) => navigate(href);

  const markManual = async (key) => {
    try {
      await api.post("/journey/mark", { key, value: true });
      toast.success("Etapa marcada!");
      load();
    } catch { toast.error("Não foi possível marcar a etapa."); }
  };

  const activeId = status?.current_stage_id;
  const missions = status?.missions || [];

  const greetingName = useMemo(() => {
    const raw = user?.name || status?.user?.name || "";
    return raw.split(" ")[0] || "por aí";
  }, [user, status]);

  if (loading || !status) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-16 md:px-8">
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  const d = status.dashboard;
  const currentMission = missions.find((m) => m.id === activeId) || missions[0];
  const grand = status.grand_completed;

  return (
    <div data-testid="jornada-page" className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
      {/* Header */}
      <div className="mb-6 rounded-3xl border border-stone-800 bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-900 p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          <Sparkles className="h-3 w-3" /> Jornada Renda Lucrativa
        </div>
        <h1 className="font-display text-3xl font-black leading-tight text-stone-50 md:text-4xl">
          Bom dia, <span className="italic text-amber-300">{greetingName}</span>! 👋
        </h1>
        <p className="mt-2 text-sm text-stone-400 md:text-base">
          {grand
            ? "Você conquistou todas as missões. Você é oficialmente Mestre da Cozinha Lucrativa 👑"
            : `Seu foco agora é a missão ${currentMission.id}: ${currentMission.title}.`}
        </p>

        {!grand && (
          <div className="mt-5 rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Próximo passo</p>
              <span className="font-display text-lg font-black text-amber-300">{currentMission.progress_pct}%</span>
            </div>
            <p className="font-display text-lg font-black text-stone-50">
              {currentMission.emoji} {currentMission.title}
            </p>
            <p className="mt-0.5 text-sm text-stone-400">{currentMission.objective}</p>
            <div className="mt-3">
              <ProgressBar pct={currentMission.progress_pct} tone={MISSION_ACCENTS[currentMission.id]?.base} />
              <p className="mt-1 text-[11px] font-bold text-stone-500">{currentMission.progress_label}</p>
            </div>
            <Button
              data-testid="journey-continue-btn"
              onClick={() => setExpanded(currentMission.id)}
              className="mt-4 w-full rounded-xl bg-amber-500 py-6 font-black text-stone-950 hover:bg-amber-600"
            >
              <Rocket className="mr-2 h-4 w-4" /> Continuar de onde parei
            </Button>
          </div>
        )}
      </div>

      {/* Dashboard KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Wallet} label="Faturamento" value={BRL(d.total_revenue)} subtitle="pedidos entregues" tone="amber" />
        <KpiCard icon={Users} label="Clientes" value={d.clients_count} subtitle="atendidos" tone="sky" />
        <KpiCard icon={Package} label="Entregas" value={d.delivered_count} subtitle="concluídas" tone="emerald" />
        <KpiCard icon={Repeat} label="Recorrentes" value={d.recurring_count} subtitle="voltaram" tone="rose" />
      </div>

      {/* Missions timeline */}
      <div className="space-y-3">
        {missions.filter((m) => !m.is_bonus).map((m) => {
          const active = m.id === activeId;
          const locked = m.id > activeId && !m.completed;
          const isExpanded = expanded === m.id;
          return (
            <MissionCard
              key={m.id}
              mission={m}
              active={active}
              locked={locked}
              expanded={isExpanded}
              onToggle={(id) => setExpanded(isExpanded ? null : id)}
              onNavigate={goTo}
              onMark={markManual}
            />
          );
        })}
      </div>

      {/* Grand achievement */}
      <div
        className={`mt-8 overflow-hidden rounded-3xl border p-6 text-center ${
          grand
            ? "border-amber-500/50 bg-gradient-to-br from-amber-500/20 via-stone-900 to-stone-900"
            : "border-stone-800 bg-stone-900/40"
        }`}
      >
        <div className={`mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full ${grand ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-600"}`}>
          <Crown className="h-8 w-8" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Grande Conquista</p>
        <h3 className="mt-1 font-display text-2xl font-black text-stone-50">Mestre da Cozinha Lucrativa</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-stone-400">
          {grand
            ? "Você concluiu as 7 missões e construiu um negócio organizado, com clientes, vendas e processos consistentes."
            : "Conclua as 7 missões pra desbloquear o selo exclusivo, o certificado \"Empreendedora Renda Lucrativa\" e a missão bônus: Rumo aos R$ 10.000/mês."}
        </p>
        {grand && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              data-testid="view-journey-certificate-btn"
              onClick={() => navigate("/jornada/certificado")}
              className="rounded-full bg-amber-500 px-6 font-black text-stone-950 hover:bg-amber-600"
            >
              <Award className="mr-2 h-4 w-4" /> Ver meu certificado
            </Button>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200">
              <Trophy className="h-4 w-4" /> Selo desbloqueado no seu perfil
            </span>
          </div>
        )}
      </div>

      {/* Bonus Mission (mission 8) */}
      {missions.filter((m) => m.is_bonus).map((m) => {
        const isExpanded = expanded === m.id;
        return (
          <BonusMissionCard
            key={m.id}
            mission={m}
            expanded={isExpanded}
            onToggle={() => setExpanded(isExpanded ? null : m.id)}
          />
        );
      })}
    </div>
  );
}

function BonusMissionCard({ mission, expanded, onToggle }) {
  const unlocked = !!mission.unlocked;
  return (
    <div
      data-testid={`journey-bonus-mission-${mission.id}`}
      className={`mt-6 overflow-hidden rounded-3xl border transition-all ${
        mission.completed
          ? "border-amber-500/60 bg-gradient-to-br from-amber-500/20 via-stone-900 to-stone-900"
          : unlocked
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-900"
          : "border-stone-800 bg-stone-900/30 opacity-80"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!unlocked && !mission.completed}
        className="flex w-full items-start gap-4 p-5 text-left disabled:cursor-not-allowed"
      >
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${unlocked ? "bg-amber-500/20" : "bg-stone-900"}`}>
          {unlocked ? mission.emoji : <Lock className="h-6 w-6 text-stone-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <Sparkles className="h-3 w-3" /> Missão bônus
            </span>
            {mission.completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-950">
                <CheckCircle2 className="h-3 w-3" /> Conquistado
              </span>
            )}
            {!unlocked && !mission.completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-stone-500">
                <Lock className="h-3 w-3" /> Bloqueada
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-xl font-black text-stone-50">{mission.title}</h3>
          <p className="mt-0.5 text-sm text-stone-400">{mission.objective}</p>
          {unlocked && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-300">{mission.progress_label}</span>
                <span className="font-black text-stone-300">{mission.progress_pct}%</span>
              </div>
              <ProgressBar pct={mission.progress_pct} tone="amber" />
            </div>
          )}
          {!unlocked && !mission.completed && (
            <p className="mt-3 text-xs text-stone-500">
              🔒 Conclua as 7 missões da Jornada Renda Lucrativa para desbloquear.
            </p>
          )}
        </div>
        {unlocked && (
          <ChevronDown className={`ml-2 mt-1 h-5 w-5 shrink-0 text-stone-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>

      {expanded && unlocked && (
        <div className="border-t border-stone-800/70 px-5 pb-5 pt-4 animate-fade-in-up">
          {mission.best_month && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
              <p className="text-stone-300">
                Seu melhor mês até agora: <b className="text-amber-300">{mission.best_month}</b> · <b className="text-amber-300">{BRL(mission.current_value)}</b>
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Meta: {BRL(mission.target_value)} em um único mês. Continue registrando pedidos entregues em <Link to="/encomendas" className="font-bold text-amber-300 underline">Encomendas</Link>.
              </p>
            </div>
          )}
          {mission.completed && (
            <div className="mt-3 rounded-2xl border border-amber-500/50 bg-amber-500/15 p-4 text-center">
              <Trophy className="mx-auto mb-2 h-6 w-6 text-amber-600" />
              <p className="font-display text-base font-black text-amber-800">
                Você atravessou a barreira dos R$ 10.000!
              </p>
              <p className="text-xs text-stone-200">
                Você está oficialmente em um novo patamar de empreendedora. 👑
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
