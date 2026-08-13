import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Send, Trash2 } from "lucide-react";

/**
 * Widget de anotações rápidas do "Meu Caderno".
 * A usuária digita livremente ("Cliente pediu menos açúcar", "Comprar embalagem")
 * e a IA classifica automaticamente em: Receitas, Clientes, Fornecedores,
 * Ideias ou Lembretes.
 *
 * Persistência: /api/notes (crud completo, requer auth).
 */

export const NOTE_CATEGORIES = {
  receitas:     { label: "Receitas",     emoji: "🧁", accent: "#A24D2A" },
  clientes:     { label: "Clientes",     emoji: "👩", accent: "#8A3F21" },
  fornecedores: { label: "Fornecedores", emoji: "🚚", accent: "#5A6B3C" },
  ideias:       { label: "Ideias",       emoji: "💡", accent: "#B98A2E" },
  lembretes:    { label: "Lembretes",    emoji: "⚠️", accent: "#C05A3E" },
};

const CATEGORY_ORDER = ["receitas", "clientes", "fornecedores", "ideias", "lembretes"];

export default function QuickNoteWidget({ compact = false }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/notes");
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      // 401 em modo beta sem login: silenciosamente vazio
      const status = e?.response?.status;
      if (status === 401) {
        setError("Entre com sua conta para salvar seu caderno.");
      } else {
        setError("Não foi possível carregar seu caderno.");
      }
      setNotes([]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || saving) return;
    setSaving(true);
    setError("");
    try {
      // 1) classifica com IA (não bloqueia se falhar → cai em "ideias")
      let category = "ideias";
      try {
        const { data } = await api.post("/ai/categorize-note", { text: value });
        if (data?.category) category = data.category;
      } catch { /* segue com fallback */ }
      // 2) persiste a nota
      const { data: created } = await api.post("/notes", { text: value, category });
      setNotes((prev) => [created, ...prev]);
      setText("");
      inputRef.current?.focus();
      const meta = NOTE_CATEGORIES[category];
      toast.success(`Salvo em ${meta?.emoji || ""} ${meta?.label || category}`);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        setError("Entre com sua conta para salvar seu caderno.");
      } else {
        setError("Não deu para salvar agora. Tente de novo.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));
    try {
      await api.delete(`/notes/${id}`);
    } catch {
      setNotes(prev);
      toast.error("Falha ao apagar.");
    }
  };

  const filteredNotes = filter === "todas"
    ? notes
    : notes.filter((n) => n.category === filter);

  const countByCat = CATEGORY_ORDER.reduce((acc, c) => {
    acc[c] = notes.filter((n) => n.category === c).length;
    return acc;
  }, {});

  return (
    <div data-testid="quick-note-widget" className="space-y-4">
      {/* Composer */}
      <form onSubmit={handleSubmit} className="rounded-3xl border border-[#EED3C3] bg-[#F4E1D5]/80 p-4 shadow-sm">
        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-[#8A3F21]">
          escreva aqui
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            data-testid="quick-note-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit(e);
            }}
            placeholder='Ex: "Cliente pediu menos açúcar" · "Comprar embalagem nº 5" · "A professora falou que pode congelar"'
            rows={compact ? 2 : 3}
            className="flex-1 resize-none rounded-2xl border border-[#EED3C3] bg-white/90 px-3 py-2 text-sm text-[#2E1B12] placeholder:text-[#8A3F21]/50 focus:border-[#A24D2A] focus:outline-none focus:ring-2 focus:ring-[#A24D2A]/30"
            maxLength={1000}
          />
          <button
            type="submit"
            data-testid="quick-note-save"
            disabled={!text.trim() || saving}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-4 text-[11px] font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {saving ? "Classificando…" : "Anotar"}
          </button>
        </div>
        <p className="mt-2 text-[10px] italic text-[#8A3F21]/70">
          a IA organiza sua anotação em 🧁 receitas · 👩 clientes · 🚚 fornecedores · 💡 ideias · ⚠️ lembretes
        </p>
        {error && (
          <p data-testid="quick-note-error" className="mt-2 text-xs font-semibold" style={{ color: "#C0392B" }}>
            {error}
          </p>
        )}
      </form>

      {/* Filtros */}
      {notes.length > 0 && (
        <div data-testid="quick-note-filters" className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={filter === "todas"}
            onClick={() => setFilter("todas")}
            testId="filter-todas"
            emoji="✳️"
            label="Todas"
            count={notes.length}
          />
          {CATEGORY_ORDER.map((c) => (
            <FilterChip
              key={c}
              active={filter === c}
              onClick={() => setFilter(c)}
              testId={`filter-${c}`}
              emoji={NOTE_CATEGORIES[c].emoji}
              label={NOTE_CATEGORIES[c].label}
              count={countByCat[c] || 0}
              accent={NOTE_CATEGORIES[c].accent}
            />
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#A24D2A]" />
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-900/30 p-8 text-center">
          <p className="text-sm text-stone-400">
            Escreva sua primeira anotação acima. Ela vai aparecer aqui, já organizada.
          </p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <p className="py-6 text-center text-xs text-stone-500">Nenhuma anotação nessa categoria ainda.</p>
      ) : (
        <ul className="space-y-2">
          {filteredNotes.map((n) => (
            <QuickNoteRow key={n.id} note={n} onDelete={() => handleDelete(n.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, testId, emoji, label, count, accent }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all"
      style={{
        borderColor: active ? (accent || "#A24D2A") : "#33261E",
        backgroundColor: active ? (accent || "#A24D2A") : "transparent",
        color: active ? "#FFF" : "#D6C8B8",
      }}
    >
      <span className="text-sm leading-none">{emoji}</span>
      {label}
      <span className={active ? "text-white/80" : "text-stone-500"}>· {count}</span>
    </button>
  );
}

function QuickNoteRow({ note, onDelete }) {
  const meta = NOTE_CATEGORIES[note.category] || NOTE_CATEGORIES.ideias;
  const date = note.created_at ? new Date(note.created_at) : null;
  const dateStr = date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "";
  return (
    <li
      data-testid={`quick-note-row-${note.id}`}
      className="group flex items-start gap-3 rounded-2xl border border-[#EED3C3] bg-[#F4E1D5]/70 p-3 shadow-sm transition-all hover:shadow"
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: `${meta.accent}22`, color: meta.accent }}
        title={meta.label}
      >
        {meta.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: meta.accent }}
          >
            {meta.label}
          </span>
          {dateStr && (
            <span className="text-[10px] text-[#8A3F21]/60">{dateStr}</span>
          )}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#2E1B12]">
          {note.text}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        data-testid={`quick-note-delete-${note.id}`}
        className="shrink-0 rounded-full p-1.5 text-[#8A3F21]/60 opacity-0 transition-all hover:bg-white/60 hover:text-red-600 group-hover:opacity-100"
        title="Apagar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
