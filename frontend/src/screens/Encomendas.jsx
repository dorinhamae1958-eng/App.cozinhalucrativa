import React, { useEffect, useMemo, useState } from "react";
import { api, BRL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Loader2, Calendar as CalendarIcon, LayoutList,
  User, Phone, Cake, CalendarDays, Clock, DollarSign, Wallet,
  StickyNote, Save, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight,
  AlertTriangle, MessageCircle, TrendingUp, PackageCheck,
} from "lucide-react";

const STATUS_LABEL = { pending: "Pendente", delivered: "Entregue", cancelled: "Cancelada" };
const STATUS_TONE = {
  pending:   "bg-[#F5D7C4] text-[#A74E26] border-[#D89A5B]/60",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/40",
  cancelled: "bg-stone-800 text-stone-400 border-stone-700",
};

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function fmtDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fmtDayName(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}
function daysDiff(isoA, isoB) {
  const a = new Date(`${isoA}T00:00:00`).getTime();
  const b = new Date(`${isoB}T00:00:00`).getTime();
  return Math.round((a - b) / 86400000);
}

export default function Encomendas() {
  const [view, setView] = useState("list");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open"); // open | all | delivered | cancelled
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([api.get("/orders"), api.get("/orders/stats")]);
      setOrders(a.data || []);
      setStats(b.data || null);
    } catch { toast.error("Erro ao carregar encomendas."); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "open") return orders.filter(o => o.status === "pending");
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const onSave = async (payload, id) => {
    try {
      if (id) await api.put(`/orders/${id}`, payload);
      else await api.post("/orders", payload);
      toast.success(id ? "Encomenda atualizada!" : "Encomenda criada!");
      setModalOpen(false); setEditing(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar.");
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Excluir esta encomenda?")) return;
    try { await api.delete(`/orders/${id}`); toast.success("Excluída."); load(); }
    catch { toast.error("Erro ao excluir."); }
  };

  const onMarkDelivered = async (o) => {
    try { await api.put(`/orders/${o.id}`, { status: "delivered", paid_amount: o.total_value }); toast.success("Encomenda entregue!"); load(); }
    catch { toast.error("Erro."); }
  };

  const onRegisterPayment = (o) => { setPayTarget(o); setPayOpen(true); };

  return (
    <div data-testid="encomendas-page" className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#F5D7C4] text-[#A74E26]">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-stone-50">
              Minhas <span className="italic text-amber-700">Encomendas</span>
            </h1>
            <p className="mt-1 text-sm text-stone-300">Cadastre pedidos, sinal recebido e nunca mais perca uma entrega.</p>
          </div>
        </div>
        <Button
          data-testid="new-order-btn"
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="rounded-full bg-amber-600 px-5 py-5 font-semibold text-stone-950 shadow-[0_0_20px_rgba(201,106,61,0.35)] hover:bg-amber-700"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar encomenda
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard testId="stat-pending" icon={Wallet} label="A receber" value={BRL(stats.total_pending || 0)} tone="terracota" />
          <StatCard testId="stat-open" icon={PackageCheck} label="Em aberto" value={stats.count_open || 0} tone="cream" />
          <StatCard testId="stat-week" icon={CalendarDays} label="Próximos 7 dias" value={stats.count_week || 0} tone="cream" />
          <StatCard testId="stat-confirmed" icon={TrendingUp} label="Confirmado" value={BRL(stats.total_confirmed || 0)} tone="cream" />
        </div>
      )}

      {/* View toggle + Filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-stone-800 bg-stone-900/60 p-1">
          <button
            data-testid="view-list"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${view === "list" ? "bg-amber-600 text-stone-950" : "text-stone-200 hover:bg-stone-800"}`}
          ><LayoutList className="h-4 w-4" /> Lista</button>
          <button
            data-testid="view-calendar"
            onClick={() => setView("calendar")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${view === "calendar" ? "bg-amber-600 text-stone-950" : "text-stone-200 hover:bg-stone-800"}`}
          ><CalendarIcon className="h-4 w-4" /> Calendário</button>
        </div>

        {view === "list" && (
          <div className="ml-auto">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger data-testid="filter-select" className="w-40 border-stone-800 bg-stone-900 text-stone-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-stone-800 bg-stone-900 text-stone-50">
                <SelectItem value="open">Em aberto</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="delivered">Entregues</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-amber-700" /></div>
      ) : orders.length === 0 ? (
        <EmptyState onNew={() => setModalOpen(true)} />
      ) : view === "list" ? (
        <OrderList
          orders={filtered}
          onEdit={(o) => { setEditing(o); setModalOpen(true); }}
          onDelete={onDelete}
          onMarkDelivered={onMarkDelivered}
          onRegisterPayment={onRegisterPayment}
        />
      ) : (
        <CalendarView orders={orders} onSelect={(o) => { setEditing(o); setModalOpen(true); }} />
      )}

      <OrderModal
        open={modalOpen}
        editing={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={onSave}
      />
      <PaymentModal
        open={payOpen}
        order={payTarget}
        onClose={() => { setPayOpen(false); setPayTarget(null); }}
        onSaved={() => { setPayOpen(false); setPayTarget(null); load(); }}
      />
    </div>
  );
}

/* ------------------- STAT CARD ------------------- */
function StatCard({ testId, icon: Icon, label, value, tone }) {
  const styles = {
    terracota: "border-[#D89A5B]/60 bg-[#F5D7C4] text-[#A74E26]",
    cream:     "border-stone-800 bg-stone-900/60 text-stone-100",
  }[tone];
  const iconStyles = {
    terracota: "bg-white/60 text-[#A74E26]",
    cream:     "bg-amber-500/15 text-amber-700",
  }[tone];
  return (
    <div data-testid={testId} className={`rounded-2xl border p-4 ${styles}`}>
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${iconStyles}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] uppercase tracking-widest font-semibold opacity-80">{label}</p>
      <div className="mt-0.5 font-display text-xl font-black">{value}</div>
    </div>
  );
}

/* ------------------- EMPTY STATE ------------------- */
function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-stone-700 bg-stone-900/30 px-8 py-16 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#F5D7C4] text-[#A74E26]">
        <Cake className="h-8 w-8" />
      </div>
      <h3 className="font-display text-2xl font-bold text-stone-50">Sem encomendas por aqui.</h3>
      <p className="mt-2 max-w-md text-sm text-stone-300">
        Cadastre a primeira encomenda: cliente, produto, data de entrega e valor. O saldo pendente é calculado sozinho.
      </p>
      <Button
        onClick={onNew}
        className="mt-6 rounded-full bg-amber-600 px-6 py-5 font-semibold text-stone-950 hover:bg-amber-700"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Cadastrar encomenda
      </Button>
    </div>
  );
}

/* ------------------- ORDER LIST ------------------- */
function OrderList({ orders, onEdit, onDelete, onMarkDelivered, onRegisterPayment }) {
  if (orders.length === 0) {
    return <p className="rounded-2xl border border-dashed border-stone-700 py-14 text-center text-sm text-stone-300">Nenhuma encomenda neste filtro.</p>;
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => <OrderCard key={o.id} order={o} onEdit={onEdit} onDelete={onDelete} onMarkDelivered={onMarkDelivered} onRegisterPayment={onRegisterPayment} />)}
    </div>
  );
}

function OrderCard({ order, onEdit, onDelete, onMarkDelivered, onRegisterPayment }) {
  const t = todayISO();
  const diff = daysDiff(order.delivery_date, t);
  const isPast = diff < 0 && order.status === "pending";
  const isToday = diff === 0 && order.status === "pending";
  const isSoon = diff > 0 && diff <= 2 && order.status === "pending";
  const paid = Number(order.paid_amount) || 0;
  const total = Number(order.total_value) || 0;
  const pending = Math.max(0, total - paid);
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const waLink = order.client_phone ? `https://wa.me/${order.client_phone.startsWith("55") ? order.client_phone : "55" + order.client_phone}?text=${encodeURIComponent(`Olá ${order.client_name.split(" ")[0]}, tudo bem? Passando para confirmar sua encomenda: ${order.product_name}, entrega em ${fmtDateBR(order.delivery_date)}${order.delivery_time ? " às " + order.delivery_time : ""}.`)}` : null;

  return (
    <div
      data-testid={`order-${order.id}`}
      className={`rounded-3xl border p-5 transition-all ${
        isPast ? "border-red-500/50 bg-red-500/5" :
        isToday ? "border-[#C96A3D] bg-[#F5D7C4]/40" :
        isSoon ? "border-[#D89A5B] bg-[#FDEAD9]" :
        order.status === "delivered" ? "border-emerald-500/30 bg-emerald-500/5 opacity-90" :
        order.status === "cancelled" ? "border-stone-700 bg-stone-900/40 opacity-60" :
        "border-stone-800 bg-stone-900/50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_TONE[order.status] || STATUS_TONE.pending}`}>
              {STATUS_LABEL[order.status] || "Pendente"}
            </span>
            {isPast && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                <AlertTriangle className="h-3 w-3" /> Atrasada
              </span>
            )}
            {isToday && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#C96A3D] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                Entrega hoje
              </span>
            )}
            {isSoon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D89A5B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#4B3425]">
                Em {diff}d
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-xl font-black leading-tight text-stone-50">{order.product_name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-200">
            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {order.client_name}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {fmtDateBR(order.delivery_date)} · <span className="capitalize">{fmtDayName(order.delivery_date)}</span></span>
            {order.delivery_time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {order.delivery_time}</span>}
          </div>
          {order.notes && <p className="mt-2 rounded-lg bg-stone-900 px-3 py-2 text-xs text-stone-300">💬 {order.notes}</p>}
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-stone-400">Total</div>
          <div className="font-display text-2xl font-black text-amber-700">{BRL(total)}</div>
          <div className="mt-0.5 text-xs text-stone-300">
            Recebido: <b className="text-emerald-700">{BRL(paid)}</b>
          </div>
          <div className={`text-xs ${pending > 0 ? "text-[#B85D34]" : "text-emerald-700"}`}>
            Saldo: <b>{BRL(pending)}</b>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
            <div className={`h-full transition-all ${paidPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-[#D89A5B] to-[#C96A3D]"}`} style={{ width: `${paidPct}%` }} />
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-stone-400">{paidPct}% pago</div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {order.status === "pending" && pending > 0 && (
          <button
            data-testid={`pay-${order.id}`}
            onClick={() => onRegisterPayment(order)}
            className="inline-flex items-center gap-1 rounded-full bg-[#F5D7C4] px-3 py-1.5 text-xs font-semibold text-[#A74E26] hover:bg-[#EED3C3]"
          ><DollarSign className="h-3.5 w-3.5" /> Registrar pagamento</button>
        )}
        {order.status === "pending" && (
          <button
            data-testid={`deliver-${order.id}`}
            onClick={() => onMarkDelivered(order)}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/25"
          ><Check className="h-3.5 w-3.5" /> Marcar entregue</button>
        )}
        {waLink && (
          <a
            data-testid={`wa-${order.id}`}
            href={waLink} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/25"
          ><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
        )}
        <button
          data-testid={`edit-${order.id}`}
          onClick={() => onEdit(order)}
          className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:bg-stone-700"
        ><Pencil className="h-3.5 w-3.5" /> Editar</button>
        <button
          data-testid={`del-${order.id}`}
          onClick={() => onDelete(order.id)}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-stone-800 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-stone-700"
        ><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
      </div>
    </div>
  );
}

/* ------------------- CALENDAR ------------------- */
function CalendarView({ orders, onSelect }) {
  const today = todayISO();
  const [ref, setRef] = useState(() => {
    const [y, m] = today.split("-");
    return { y: Number(y), m: Number(m) };
  });

  const byDate = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const arr = map.get(o.delivery_date) || [];
      arr.push(o);
      map.set(o.delivery_date, arr);
    }
    return map;
  }, [orders]);

  const first = new Date(ref.y, ref.m - 1, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(ref.y, ref.m, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${ref.y}-${String(ref.m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso, items: byDate.get(iso) || [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const move = (delta) => {
    let m = ref.m + delta;
    let y = ref.y;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setRef({ y, m });
  };
  const monthLabel = new Date(ref.y, ref.m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div data-testid="calendar-view" className="rounded-3xl border border-stone-800 bg-stone-900/50 p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          data-testid="cal-prev"
          onClick={() => move(-1)}
          className="grid h-9 w-9 place-items-center rounded-full bg-stone-800 text-stone-100 hover:bg-stone-700"
        ><ChevronLeft className="h-4 w-4" /></button>
        <h3 className="font-display text-xl font-bold capitalize text-stone-50">{monthLabel}</h3>
        <button
          data-testid="cal-next"
          onClick={() => move(1)}
          className="grid h-9 w-9 place-items-center rounded-full bg-stone-800 text-stone-100 hover:bg-stone-700"
        ><ChevronRight className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-stone-400">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => <div key={w} className="pb-2">{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={`empty-${ref.y}-${ref.m}-${i}`} className="min-h-[80px]" />;
          const isToday = c.iso === today;
          const totalPending = c.items.reduce((s, o) => s + Math.max(0, (o.total_value || 0) - (o.paid_amount || 0)), 0);
          return (
            <div
              key={c.iso}
              data-testid={`cal-day-${c.iso}`}
              className={`min-h-[80px] rounded-xl border p-1.5 text-left transition-all ${
                isToday ? "border-[#C96A3D] bg-[#F5D7C4]/60" : "border-stone-800 bg-stone-900/40"
              }`}
            >
              <div className={`text-xs font-bold ${isToday ? "text-[#A74E26]" : "text-stone-200"}`}>{c.day}</div>
              <div className="mt-1 space-y-0.5">
                {c.items.slice(0, 3).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onSelect(o)}
                    className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold ${
                      o.status === "delivered" ? "bg-emerald-500/15 text-emerald-700" :
                      "bg-[#F5D7C4] text-[#A74E26] hover:bg-[#EED3C3]"
                    }`}
                    title={`${o.client_name} · ${o.product_name}`}
                  >{o.client_name.split(" ")[0]} · {o.product_name}</button>
                ))}
                {c.items.length > 3 && (
                  <div className="text-[9px] text-stone-400">+{c.items.length - 3} mais</div>
                )}
                {totalPending > 0 && c.items.some(o => o.status === "pending") && (
                  <div className="mt-1 text-[9px] font-bold text-[#B85D34]">{BRL(totalPending)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------- ORDER MODAL ------------------- */
function OrderModal({ open, editing, onClose, onSave }) {
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          client_name: editing.client_name || "",
          client_phone: editing.client_phone || "",
          product_name: editing.product_name || "",
          delivery_date: editing.delivery_date || todayISO(),
          delivery_time: editing.delivery_time || "",
          total_value: String(editing.total_value ?? ""),
          paid_amount: String(editing.paid_amount ?? "0"),
          notes: editing.notes || "",
          status: editing.status || "pending",
        });
      } else {
        setForm(defaultForm());
      }
    }
  }, [open, editing]);

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.client_name.trim() || !form.product_name.trim() || !form.delivery_date) {
      return toast.error("Preencha cliente, produto e data de entrega.");
    }
    setSaving(true);
    await onSave({
      client_name: form.client_name.trim(),
      client_phone: form.client_phone,
      product_name: form.product_name.trim(),
      delivery_date: form.delivery_date,
      delivery_time: form.delivery_time,
      total_value: Number(form.total_value) || 0,
      paid_amount: Number(form.paid_amount) || 0,
      notes: form.notes,
      status: form.status,
    }, editing?.id);
    setSaving(false);
  };

  const total = Number(form.total_value) || 0;
  const paid = Number(form.paid_amount) || 0;
  const pending = Math.max(0, total - paid);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="order-modal"
        className="max-h-[92vh] overflow-y-auto border-stone-800 bg-stone-950 text-stone-50 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editing ? "Editar encomenda" : "Adicionar encomenda"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Cliente" icon={User}>
            <Input data-testid="f-client" value={form.client_name} onChange={(e) => setF("client_name", e.target.value)} placeholder="Ex: Maria Silva" className="border-stone-800 bg-stone-900 text-stone-50" />
          </Field>
          <Field label="WhatsApp do cliente" icon={Phone} hint="Sem DDI. Ex: 11987654321">
            <Input data-testid="f-phone" value={form.client_phone} onChange={(e) => setF("client_phone", e.target.value.replace(/\D/g, ""))} placeholder="11987654321" maxLength={13} inputMode="numeric" className="border-stone-800 bg-stone-900 text-stone-50" />
          </Field>
          <Field label="Produto encomendado" icon={Cake}>
            <Input data-testid="f-product" value={form.product_name} onChange={(e) => setF("product_name", e.target.value)} placeholder="Ex: Bolo de chocolate 2kg" className="border-stone-800 bg-stone-900 text-stone-50" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data entrega" icon={CalendarDays}>
              <Input data-testid="f-date" type="date" value={form.delivery_date} onChange={(e) => setF("delivery_date", e.target.value)} className="border-stone-800 bg-stone-900 text-stone-50" />
            </Field>
            <Field label="Horário" icon={Clock}>
              <Input data-testid="f-time" type="time" value={form.delivery_time} onChange={(e) => setF("delivery_time", e.target.value)} className="border-stone-800 bg-stone-900 text-stone-50" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total" icon={DollarSign}>
              <Input data-testid="f-total" type="number" step="0.01" value={form.total_value} onChange={(e) => setF("total_value", e.target.value)} placeholder="120" className="border-stone-800 bg-stone-900 text-stone-50" />
            </Field>
            <Field label="Sinal recebido" icon={Wallet}>
              <Input data-testid="f-paid" type="number" step="0.01" value={form.paid_amount} onChange={(e) => setF("paid_amount", e.target.value)} placeholder="0" className="border-stone-800 bg-stone-900 text-stone-50" />
            </Field>
          </div>

          {total > 0 && (
            <div className="rounded-2xl border border-[#D89A5B]/50 bg-[#F5D7C4]/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#4B3425]">Saldo pendente</span>
                <span className={`font-display text-xl font-black ${pending > 0 ? "text-[#B85D34]" : "text-emerald-700"}`}>{BRL(pending)}</span>
              </div>
            </div>
          )}

          <Field label="Observações" icon={StickyNote} hint="Sabor, recheio, cor, endereço, alergias…">
            <Textarea data-testid="f-notes" value={form.notes} onChange={(e) => setF("notes", e.target.value)} rows={3} placeholder="Ex: Recheio de brigadeiro, entrega às 15h no bairro Jardim." className="border-stone-800 bg-stone-900 text-stone-50" />
          </Field>

          {editing && (
            <Field label="Status" icon={PackageCheck}>
              <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                <SelectTrigger data-testid="f-status" className="border-stone-800 bg-stone-900 text-stone-50"><SelectValue /></SelectTrigger>
                <SelectContent className="border-stone-800 bg-stone-900 text-stone-50">
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-stone-200 hover:bg-stone-800">Cancelar</Button>
          <Button
            data-testid="order-save-btn"
            onClick={submit}
            disabled={saving}
            className="rounded-full bg-amber-600 font-semibold text-stone-950 hover:bg-amber-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultForm() {
  return {
    client_name: "", client_phone: "", product_name: "",
    delivery_date: todayISO(), delivery_time: "",
    total_value: "", paid_amount: "0", notes: "", status: "pending",
  };
}

function Field({ label, icon: Icon, hint, children }) {
  return (
    <div>
      <Label className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-300">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-stone-400">{hint}</p>}
    </div>
  );
}

/* ------------------- PAYMENT MODAL ------------------- */
function PaymentModal({ open, order, onClose, onSaved }) {
  const [add, setAdd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setAdd(""); }, [open]);

  if (!order) return null;
  const total = Number(order.total_value) || 0;
  const currentPaid = Number(order.paid_amount) || 0;
  const currentPending = Math.max(0, total - currentPaid);
  const addNum = Number(add) || 0;
  const newPaid = currentPaid + addNum;
  const newPending = Math.max(0, total - newPaid);

  const save = async () => {
    if (addNum <= 0) return toast.error("Informe um valor válido.");
    setSaving(true);
    try {
      const patch = { paid_amount: newPaid };
      if (newPaid >= total) patch.status = "delivered";
      await api.put(`/orders/${order.id}`, patch);
      toast.success(newPaid >= total ? "Pago em cheio! Encomenda quitada 🎉" : "Pagamento registrado!");
      onSaved();
    } catch { toast.error("Erro."); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-testid="payment-modal" className="border-stone-800 bg-stone-950 text-stone-50 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Registrar pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-stone-900 p-3">
            <div className="text-xs text-stone-400">{order.client_name}</div>
            <div className="font-semibold text-stone-100">{order.product_name}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-stone-900 p-2">
              <div className="text-stone-400">Total</div>
              <div className="font-display text-base font-bold text-stone-100">{BRL(total)}</div>
            </div>
            <div className="rounded-lg bg-stone-900 p-2">
              <div className="text-stone-400">Já pago</div>
              <div className="font-display text-base font-bold text-emerald-700">{BRL(currentPaid)}</div>
            </div>
          </div>

          <Field label="Valor recebido agora" icon={DollarSign}>
            <Input
              data-testid="p-amount"
              type="number" step="0.01" autoFocus
              value={add} onChange={(e) => setAdd(e.target.value)}
              placeholder={String(currentPending.toFixed(2))}
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </Field>

          <div className="flex gap-2">
            {[currentPending, currentPending / 2, 20, 50].filter(v => v > 0 && v <= total).slice(0, 3).map((v, i) => (
              <button
                key={`quick-${i}-${v}`}
                type="button"
                onClick={() => setAdd(v.toFixed(2))}
                className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-200 hover:bg-stone-700"
              >+ {BRL(v)}</button>
            ))}
          </div>

          <div className="rounded-2xl border border-[#D89A5B]/50 bg-[#F5D7C4]/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4B3425]">Saldo após</span>
              <span className={`font-display text-lg font-black ${newPending > 0 ? "text-[#B85D34]" : "text-emerald-700"}`}>{BRL(newPending)}</span>
            </div>
            {newPaid >= total && total > 0 && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">✔ Encomenda será marcada como entregue.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-stone-200 hover:bg-stone-800">Cancelar</Button>
          <Button
            data-testid="p-save"
            onClick={save} disabled={saving}
            className="rounded-full bg-amber-600 font-semibold text-stone-950 hover:bg-amber-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
