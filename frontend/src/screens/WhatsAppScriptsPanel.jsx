import React, { useEffect, useMemo, useState } from "react";
import { WHATSAPP_CATEGORIES, WHATSAPP_SCRIPTS } from "@/lib/whatsapp-scripts";
import { MessageCircle, Copy, Send, ChevronDown, Sparkles, User, Cookie, Link as LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cl_wa_scripts_state_v1";

const TONES = {
  emerald: {
    ring: "ring-emerald-500/40",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    chipActive: "bg-emerald-500 text-stone-950 border-emerald-500",
    dot: "bg-emerald-400",
    hl: "text-emerald-300",
  },
  amber: {
    ring: "ring-amber-500/40",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    chipActive: "bg-amber-500 text-stone-950 border-amber-500",
    dot: "bg-amber-400",
    hl: "text-amber-300",
  },
  sky: {
    ring: "ring-sky-500/40",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    chipActive: "bg-sky-500 text-stone-950 border-sky-500",
    dot: "bg-sky-400",
    hl: "text-sky-300",
  },
  rose: {
    ring: "ring-rose-500/40",
    chip: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    chipActive: "bg-rose-500 text-stone-950 border-rose-500",
    dot: "bg-rose-400",
    hl: "text-rose-300",
  },
};

function renderMessage(template, vars) {
  return (template || "")
    .replaceAll("{cliente}", vars.cliente || "cliente")
    .replaceAll("{especialidade}", vars.especialidade || "sua encomenda")
    .replaceAll("{link}", vars.link || "");
}

function HighlightedPreview({ text, tone }) {
  // Highlights placeholder tokens for the raw template preview mode.
  const parts = (text || "").split(/(\{cliente\}|\{especialidade\}|\{link\})/g);
  const t = TONES[tone] || TONES.emerald;
  return (
    <span>
      {parts.map((p, i) => {
        if (p === "{cliente}" || p === "{especialidade}" || p === "{link}") {
          const label = p.replace(/[{}]/g, "");
          return (
            <span
              key={`ph-${label}-${i}`}
              className={`mx-0.5 inline-block rounded-md border border-dashed px-1.5 py-0 text-[11px] font-semibold uppercase tracking-wider ${t.chip}`}
            >
              {label}
            </span>
          );
        }
        return <React.Fragment key={`txt-${i}`}>{p}</React.Fragment>;
      })}
    </span>
  );
}

export default function WhatsAppScriptsPanel({ store, phoneHint }) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(WHATSAPP_CATEGORIES[0].id);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const publicUrl = useMemo(() => {
    if (!store?.slug) return "";
    if (typeof window !== "undefined") return `${window.location.origin}/vitrine/${store.slug}`;
    return `/vitrine/${store.slug}`;
  }, [store?.slug]);

  const [vars, setVars] = useState({ cliente: "", especialidade: "", link: "" });

  // Load persisted personalization (per user/store).
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        setVars((v) => ({ ...v, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);

  // Keep the link field in sync with the store URL by default (unless user manually changed).
  useEffect(() => {
    setVars((v) => (v.link ? v : { ...v, link: publicUrl }));
  }, [publicUrl]);

  const updateVar = (key, value) => {
    setVars((v) => {
      const next = { ...v, [key]: value };
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const activeCategory = WHATSAPP_CATEGORIES.find((c) => c.id === activeCat) || WHATSAPP_CATEGORIES[0];
  const scriptsOfCat = WHATSAPP_SCRIPTS.filter((s) => s.category === activeCat);
  const tone = TONES[activeCategory.color] || TONES.emerald;

  const copyMessage = async (script) => {
    const text = renderMessage(script.message, { ...vars, link: vars.link || publicUrl });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(script.id);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopiedId((c) => (c === script.id ? null : c)), 1600);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const sendWhatsApp = (script) => {
    const text = renderMessage(script.message, { ...vars, link: vars.link || publicUrl });
    const phoneDigits = (phoneHint || "").replace(/\D/g, "");
    const base = phoneDigits ? `https://wa.me/${phoneDigits}` : "https://wa.me/";
    const url = `${base}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      data-testid="wa-scripts-panel"
      className={`overflow-hidden rounded-3xl border border-stone-800 bg-gradient-to-br from-emerald-500/10 via-stone-900 to-stone-900 transition-all ${open ? "" : "hover:border-emerald-500/40"}`}
    >
      {/* Header — collapsible trigger */}
      <button
        data-testid="wa-scripts-toggle"
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-black text-stone-50">
              Mensagens que <span className="italic text-emerald-400">vendem</span>
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-500/30">
              <Sparkles className="h-3 w-3" /> Bônus
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-stone-400">
            8 scripts prontos pra converter clientes no WhatsApp. Copie ou envie em 1 clique.
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-emerald-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-stone-800/70 px-5 pb-5 pt-4 animate-fade-in-up">
          {/* Personalização */}
          <div className="mb-4 rounded-2xl border border-stone-800 bg-stone-950/50 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-stone-500">
              Personalize uma vez, use em todas as mensagens
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <PersonalField
                icon={User}
                label="Nome do cliente"
                placeholder="Ex: Ana"
                value={vars.cliente}
                onChange={(v) => updateVar("cliente", v)}
                testId="wa-var-cliente"
              />
              <PersonalField
                icon={Cookie}
                label="Produto/especialidade"
                placeholder="Ex: bolo de chocolate"
                value={vars.especialidade}
                onChange={(v) => updateVar("especialidade", v)}
                testId="wa-var-especialidade"
              />
              <PersonalField
                icon={LinkIcon}
                label="Link da sua vitrine"
                placeholder={publicUrl || "cole seu link aqui"}
                value={vars.link}
                onChange={(v) => updateVar("link", v)}
                testId="wa-var-link"
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-stone-500">
                Os campos aparecem automaticamente nas mensagens onde forem citados.
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-stone-400">
                <input
                  type="checkbox"
                  checked={showRaw}
                  onChange={(e) => setShowRaw(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-500"
                  data-testid="wa-toggle-raw"
                />
                mostrar variáveis
              </label>
            </div>
          </div>

          {/* Category tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {WHATSAPP_CATEGORIES.map((c) => {
              const t = TONES[c.color] || TONES.emerald;
              const active = c.id === activeCat;
              return (
                <button
                  key={c.id}
                  data-testid={`wa-cat-${c.id}`}
                  onClick={() => { setActiveCat(c.id); setExpandedId(null); }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                    active ? t.chipActive : t.chip
                  }`}
                >
                  <span className="text-sm leading-none">{c.emoji}</span>
                  {c.title}
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex items-center gap-2 text-xs text-stone-500">
            <span className={`inline-block h-2 w-2 rounded-full ${tone.dot}`} />
            <span>{activeCategory.subtitle}</span>
          </div>

          {/* Scripts list */}
          <div className="space-y-2">
            {scriptsOfCat.map((s, idx) => {
              const expanded = expandedId === s.id;
              const preview = renderMessage(s.message, { ...vars, link: vars.link || publicUrl });
              return (
                <div
                  key={s.id}
                  data-testid={`wa-script-${s.id}`}
                  className={`rounded-2xl border border-stone-800 bg-stone-950/50 transition-all ${expanded ? `ring-2 ${tone.ring}` : "hover:border-stone-700"}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    className="flex w-full items-start gap-3 p-4 text-left"
                    data-testid={`wa-script-toggle-${s.id}`}
                  >
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-900 text-xs font-black ${tone.hl}`}>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-100">{s.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{s.description}</p>
                    </div>
                    <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-stone-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {expanded && (
                    <div className="border-t border-stone-800 px-4 pb-4 pt-3 animate-fade-in-up">
                      <div className="mb-3 rounded-xl bg-stone-900/70 p-4 text-sm leading-relaxed text-stone-100" data-testid={`wa-script-preview-${s.id}`}>
                        {showRaw ? (
                          <HighlightedPreview text={s.message} tone={activeCategory.color} />
                        ) : (
                          preview
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          data-testid={`wa-copy-${s.id}`}
                          onClick={() => copyMessage(s)}
                          className="rounded-xl bg-stone-800 py-5 text-sm font-bold text-stone-100 hover:bg-stone-700"
                        >
                          {copiedId === s.id ? (
                            <><Check className="mr-2 h-4 w-4 text-emerald-400" /> Copiado</>
                          ) : (
                            <><Copy className="mr-2 h-4 w-4" /> Copiar mensagem</>
                          )}
                        </Button>
                        <Button
                          data-testid={`wa-send-${s.id}`}
                          onClick={() => sendWhatsApp(s)}
                          className="rounded-xl bg-emerald-500 py-5 text-sm font-bold text-stone-950 hover:bg-emerald-600"
                        >
                          <Send className="mr-2 h-4 w-4" /> Enviar no WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11px] text-stone-500">
            💡 Dica: personalize o nome e o produto no topo. A mensagem já sai adaptada.
          </p>
        </div>
      )}
    </div>
  );
}

function PersonalField({ icon: Icon, label, placeholder, value, onChange, testId }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-400">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <input
        data-testid={testId}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-800 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
      />
    </label>
  );
}
