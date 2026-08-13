import React, { useEffect, useRef, useState } from "react";
import { api, BRL } from "@/lib/api";
import { fileToCompressedDataURL, waLink } from "@/lib/imageUtils";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import WhatsAppScriptsPanel from "@/pages/WhatsAppScriptsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calculator, TrendingUp, DollarSign, Home, User, Cake, Clock, Wallet,
  Plus, Trash2, Pencil, Sparkles, Info, Save, Loader2, ChevronDown,
  BarChart3, Package, ShoppingCart, Lightbulb, Check, Store,
  Image as ImageIcon, Camera, MessageCircle, Share2, Copy, Instagram,
  Facebook, Download, Eye, EyeOff, Link as LinkIcon, ExternalLink,
} from "lucide-react";

const YIELD_UNITS = [
  "bolo inteiro", "fatias", "unidades", "porções", "docinhos",
  "potes", "brigadeiros", "cupcakes", "kg", "litros",
];

// Field hints — shown as light suggestions to guide the student
const HINTS = {
  ingredient_cost: {
    label: "Gasto com ingredientes",
    example: "Ex: R$ 38,00",
    hint: "Some tudo que gastou para fazer esta receita (farinha, ovos, açúcar, etc). Se não lembrar exato, coloque um valor aproximado. O importante é contabilizar tudo.",
    icon: ShoppingCart,
  },
  fixed_costs: {
    label: "Custos fixos",
    example: "Ex: R$ 5,00",
    hint: "Luz, água, aluguel e outros custos da produção. Não sabe calcular? Use como referência 10% do valor dos ingredientes. É uma estimativa simples para começar.",
    icon: Home,
  },
  extra_costs: {
    label: "Custos extras",
    example: "Ex: R$ 8,00",
    hint: "Gás, embalagem, entrega, marketing, redes sociais... Some tudo junto. Se não souber ao certo, coloque um valor aproximado.",
    icon: Package,
  },
  prep_minutes: {
    label: "Tempo de preparo (min)",
    example: "Ex: 60",
    hint: "Quantos minutos você leva do início ao fim, incluindo limpeza.",
    icon: Clock,
  },
  desired_earning: {
    label: "Quanto quer ganhar",
    example: "Ex: R$ 30,00",
    hint: "Seu pagamento por fazer essa receita. Pense no quanto vale sua hora de trabalho.",
    icon: Wallet,
  },
  yield: {
    label: "Rendimento",
    example: "Ex: 10 fatias  ou  1 bolo inteiro",
    hint: "O que essa receita produz? Um bolo inteiro? 10 fatias? 30 brigadeiros?",
    icon: Cake,
  },
};

export default function Calculadora() {
  const [tab, setTab] = useState("calc");
  const [recipes, setRecipes] = useState([]);
  const [recipeId, setRecipeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async (selectId) => {
    try {
      const { data } = await api.get("/recipes");
      setRecipes(data || []);
      if (selectId) setRecipeId(selectId);
      else if (!recipeId && (data || []).length) setRecipeId(data[0].id);
    } catch { setRecipes([]); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const current = recipes.find((r) => r.id === recipeId);

  return (
    <div data-testid="calculadora-page" className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">
      {/* Tabs */}
      <div className="mb-8 flex gap-2 rounded-full border border-stone-800 bg-stone-900/60 p-1.5 backdrop-blur">
        <button
          data-testid="tab-calc"
          onClick={() => setTab("calc")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-all ${
            tab === "calc" ? "bg-amber-600 text-stone-950 shadow-[0_0_20px_rgba(217,119,6,0.4)]" : "text-stone-300 hover:bg-stone-800"
          }`}
        >
          <Calculator className="h-4 w-4" /> Calculadora
        </button>
        <button
          data-testid="tab-earnings"
          onClick={() => setTab("earnings")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-all ${
            tab === "earnings" ? "bg-amber-600 text-stone-950 shadow-[0_0_20px_rgba(217,119,6,0.4)]" : "text-stone-300 hover:bg-stone-800"
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Ganhos
        </button>
      </div>

      {tab === "calc" && (
        <CalcView
          loading={loading}
          recipes={recipes}
          recipeId={recipeId}
          setRecipeId={setRecipeId}
          current={current}
          onNew={() => { setEditing(null); setModalOpen(true); }}
          onEdit={() => { if (current) { setEditing(current); setModalOpen(true); } }}
          reload={load}
        />
      )}
      {tab === "earnings" && <EarningsView />}

      <RecipeModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={(id) => { setModalOpen(false); load(id); }}
        onDeleted={() => { setModalOpen(false); setRecipeId(""); load(); }}
      />
    </div>
  );
}

/* ---------------- CALCULATOR VIEW ---------------- */
function CalcView({ loading, recipes, recipeId, setRecipeId, current, onNew, onEdit }) {
  const [savingLevel, setSavingLevel] = useState(null);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  if (recipes.length === 0) {
    return (
      <div data-testid="empty-state" className="flex flex-col items-center rounded-3xl border border-dashed border-stone-800 bg-stone-900/30 px-8 py-20 text-center">
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 shadow-[0_0_25px_rgba(217,119,6,0.35)]">
          <Calculator className="h-8 w-8" />
        </div>
        <h2 className="font-display text-3xl font-black text-stone-50">Calculadora Inteligente</h2>
        <p className="mt-3 max-w-md text-base text-stone-400">
          Preencha 6 campos rapidinho e receba 3 sugestões de preço para você escolher a que faz mais sentido.
        </p>
        <Button
          data-testid="create-first-recipe-btn"
          onClick={onNew}
          className="mt-8 rounded-full bg-amber-600 px-8 py-6 text-base font-semibold text-stone-950 hover:bg-amber-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Precificar minha primeira receita
        </Button>
        <p className="mt-4 text-xs text-stone-500">Leva menos de 2 minutos.</p>
      </div>
    );
  }

  const save = async (level, price) => {
    setSavingLevel(level);
    try {
      await api.post("/pricing/save", { recipe_id: current.id, level });
      toast.success(`Preço ${labelFor(level).toLowerCase()} salvo: ${BRL(price)}`);
    } catch { toast.error("Erro ao salvar."); }
    setSavingLevel(null);
  };

  const c = current?.computed;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
          <Calculator className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-black leading-tight text-stone-50">
            Calculadora <span className="italic text-amber-400">Inteligente</span>
          </h1>
          <p className="mt-1 text-sm text-stone-400">Escolha uma receita e veja 3 preços possíveis.</p>
        </div>
      </div>

      {/* Recipe selector */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label className="text-xs uppercase tracking-widest text-stone-500">Receita</Label>
          <Select value={recipeId} onValueChange={setRecipeId}>
            <SelectTrigger data-testid="recipe-select" className="mt-1 h-auto border-stone-800 bg-stone-900 py-3 text-left text-lg font-display font-bold text-stone-50">
              <SelectValue placeholder="Escolha uma receita" />
            </SelectTrigger>
            <SelectContent className="border-stone-800 bg-stone-900 text-stone-50">
              {recipes.map((rec) => (
                <SelectItem key={rec.id} value={rec.id}>{rec.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          data-testid="edit-recipe-btn"
          onClick={onEdit}
          variant="ghost"
          className="h-[50px] rounded-2xl border border-stone-800 bg-stone-900 px-4 text-sm font-semibold text-amber-300 hover:bg-stone-800"
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
        </Button>
        <Button
          data-testid="new-recipe-btn"
          onClick={onNew}
          variant="ghost"
          className="h-[50px] rounded-2xl border border-stone-800 bg-stone-900 px-4 text-sm font-semibold text-stone-300 hover:bg-stone-800"
          title="Adicionar receita"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary of the recipe totals */}
      {c && current && (
        <div className="rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-stone-500">Resumo dos gastos</p>
            <span className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-300">
              Rende {current.yield_quantity} {current.yield_unit}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip label="Ingredientes" value={c.ingredient_cost} accent="emerald" />
            <SummaryChip label="Custos fixos" value={c.fixed_costs} accent="amber" />
            <SummaryChip label="Custos extras" value={c.extra_costs} accent="sky" />
            <SummaryChip label="Seu ganho" value={c.desired_earning} accent="fuchsia" />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-stone-800 pt-3 text-sm">
            <span className="text-stone-400">Custo total da receita</span>
            <span className="font-display text-lg font-black text-stone-100">{BRL(c.total_costs)}</span>
          </div>
        </div>
      )}

      {/* Minhas Anotações — mostra o que o dono anotou nesta receita */}
      {current && current.personal_notes && current.personal_notes.trim().length > 0 && (
        <div className="rounded-3xl border border-[#EED3C3] bg-[#F4E1D5]/50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#8A3F21]" />
            <span className="text-xs uppercase tracking-widest font-bold text-[#8A3F21]">Minhas Anotações</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#2E1B12]">{current.personal_notes}</p>
        </div>
      )}

      {/* Semáforo — 3 price suggestions */}
      {c && (
        <div className="rounded-3xl border border-stone-800 bg-stone-900/50 p-6">
          <div className="text-center">
            <h3 className="font-display text-xl font-bold text-stone-50">Semáforo do Lucro</h3>
            <p className="mt-1 text-xs text-stone-400">Escolha o preço que faz mais sentido para você</p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <PriceCard
              level="low"
              testId="price-low"
              title="Preço mínimo"
              subtitle="cobre custos + seu ganho"
              option={c.options[0]}
              yieldUnit={current.yield_unit}
              yieldQty={current.yield_quantity}
              saving={savingLevel === "low"}
              onSave={() => save("low", c.options[0].price)}
              tone="warn"
            />
            <PriceCard
              level="medium"
              testId="price-medium"
              title="Preço ideal"
              subtitle="recomendado, margem saudável"
              option={c.options[1]}
              yieldUnit={current.yield_unit}
              yieldQty={current.yield_quantity}
              saving={savingLevel === "medium"}
              onSave={() => save("medium", c.options[1].price)}
              tone="good"
              recommended
            />
            <PriceCard
              level="high"
              testId="price-high"
              title="Preço ambicioso"
              subtitle="para clientes premium"
              option={c.options[2]}
              yieldUnit={current.yield_unit}
              yieldQty={current.yield_quantity}
              saving={savingLevel === "high"}
              onSave={() => save("high", c.options[2].price)}
              tone="great"
            />
          </div>
        </div>
      )}

      <div className="pt-2 text-center text-xs text-stone-500">
        🔒 Seus cálculos estão seguros e salvos com você.
      </div>
    </div>
  );
}

function labelFor(level) {
  return { low: "Mínimo", medium: "Ideal", high: "Ambicioso" }[level] || "Ideal";
}

function SummaryChip({ label, value, accent }) {
  const c = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    sky: "text-sky-400",
    fuchsia: "text-fuchsia-400",
  }[accent];
  return (
    <div className="rounded-2xl bg-stone-900 p-3">
      <p className="text-[10px] uppercase tracking-widest text-stone-500">{label}</p>
      <p className={`mt-1 font-display text-base font-black ${c}`}>{BRL(value)}</p>
    </div>
  );
}

function PriceCard({ testId, level, title, subtitle, option, yieldUnit, yieldQty, tone, recommended, saving, onSave }) {
  const toneMap = {
    warn: {
      dot: "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.7)]",
      border: "border-red-500/30",
      textAccent: "text-red-300",
      buttonBg: "bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/40",
    },
    good: {
      dot: "bg-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.7)]",
      border: "border-amber-400/40",
      textAccent: "text-amber-300",
      buttonBg: "bg-amber-500 hover:bg-amber-600 text-stone-950",
    },
    great: {
      dot: "bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.7)]",
      border: "border-emerald-500/40",
      textAccent: "text-emerald-300",
      buttonBg: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
    },
  }[tone];

  return (
    <div
      data-testid={testId}
      className={`relative flex flex-col rounded-3xl border-2 bg-stone-950/50 p-5 transition-all ${toneMap.border} ${recommended ? "shadow-[0_0_35px_rgba(251,191,36,0.15)]" : ""}`}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-stone-950">
          Recomendado
        </div>
      )}
      <div className="mx-auto mb-3">
        <div className={`h-14 w-14 rounded-full ${toneMap.dot}`} />
      </div>
      <div className="text-center">
        <p className={`text-[10px] uppercase tracking-widest font-semibold ${toneMap.textAccent}`}>{title}</p>
        <p className="mt-0.5 text-[10px] text-stone-500">{subtitle}</p>
      </div>
      <div className="mt-4 text-center">
        <p className="font-display text-3xl font-black text-stone-50">{BRL(option.price)}</p>
        {yieldQty > 1 && (
          <p className="mt-1 text-[11px] text-stone-500">
            {BRL(option.price_per_unit)} por {yieldUnit.replace(/s$/, "")}
          </p>
        )}
        <p className={`mt-2 text-xs font-semibold ${toneMap.textAccent}`}>
          Margem {Math.round((option.margin || 0) * 100)}%
        </p>
      </div>
      <Button
        onClick={onSave}
        disabled={saving}
        data-testid={`${testId}-save`}
        className={`mt-5 w-full rounded-full py-5 text-xs font-bold transition-all ${toneMap.buttonBg}`}
      >
        {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
        Escolher este
      </Button>
    </div>
  );
}

/* ---------------- RECIPE MODAL ---------------- */
export function RecipeModal({ open, editing, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: "", ingredient_cost: "", fixed_costs: "", extra_costs: "",
    prep_minutes: "", desired_earning: "", yield_quantity: "", yield_unit: "unidades",
    photo: null, short_description: "", available: true, display_price: "",
    personal_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name || "",
        ingredient_cost: editing?.ingredient_cost?.toString() || "",
        fixed_costs: editing?.fixed_costs?.toString() || "",
        extra_costs: editing?.extra_costs?.toString() || "",
        prep_minutes: editing?.prep_minutes?.toString() || "",
        desired_earning: editing?.desired_earning?.toString() || "",
        yield_quantity: editing?.yield_quantity?.toString() || "",
        yield_unit: editing?.yield_unit || "unidades",
        photo: editing?.photo || null,
        short_description: editing?.short_description || "",
        available: editing?.available !== false,
        display_price: editing?.display_price?.toString() || "",
        personal_notes: editing?.personal_notes || "",
      });
    }
  }, [open, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Foto muito grande (máx 8MB).");
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataURL(file);
      set("photo", dataUrl);
    } catch { toast.error("Erro ao processar imagem."); }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.name) return toast.error("Dê um nome à receita.");
    if (!form.ingredient_cost) return toast.error("Informe o gasto com ingredientes.");
    if (!form.yield_quantity) return toast.error("Informe o rendimento.");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        ingredient_cost: Number(form.ingredient_cost) || 0,
        fixed_costs: Number(form.fixed_costs) || 0,
        extra_costs: Number(form.extra_costs) || 0,
        prep_minutes: Number(form.prep_minutes) || 0,
        desired_earning: Number(form.desired_earning) || 0,
        yield_quantity: Number(form.yield_quantity) || 1,
        yield_unit: form.yield_unit,
        photo: form.photo,
        short_description: form.short_description,
        available: form.available,
        display_price: form.display_price === "" ? null : Number(form.display_price),
        personal_notes: form.personal_notes,
      };
      const saved = editing
        ? (await api.put(`/recipes/${editing.id}`, payload)).data
        : (await api.post("/recipes", payload)).data;
      toast.success(editing ? "Receita atualizada!" : "Receita criada!");
      onSaved(saved.id);
    } catch { toast.error("Erro ao salvar."); }
    setSaving(false);
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir esta receita?")) return;
    try {
      await api.delete(`/recipes/${editing.id}`);
      toast.success("Receita excluída.");
      onDeleted();
    } catch { toast.error("Erro ao excluir."); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="recipe-modal"
        className="max-h-[92vh] overflow-y-auto border-stone-800 bg-stone-950 text-stone-50 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editing ? "Editar receita" : "Cadastrar receita"}
          </DialogTitle>
          <p className="text-sm text-stone-400">
            Preencha os valores, mesmo que aproximados. <span className="text-amber-400">O importante é contabilizar tudo.</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Foto */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold text-stone-100">
              <Camera className="h-3.5 w-3.5 text-amber-400" />
              Foto da receita <span className="text-xs font-normal text-stone-500">(opcional, mas ajuda vender)</span>
            </Label>
            <input
              ref={fileRef} type="file" accept="image/*"
              onChange={handleFile} className="hidden"
              data-testid="rec-photo-input"
            />
            {form.photo ? (
              <div className="relative overflow-hidden rounded-2xl border border-stone-800">
                <img src={form.photo} alt="preview" className="h-48 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <button
                    type="button"
                    data-testid="rec-photo-change"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-white/30"
                  >Trocar foto</button>
                  <button
                    type="button"
                    onClick={() => set("photo", null)}
                    className="rounded-full bg-red-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                  >Remover</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                data-testid="rec-photo-upload"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-800 bg-stone-900/50 py-8 text-stone-400 transition-colors hover:border-amber-500/40 hover:text-amber-400"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
                <span className="text-sm font-semibold">{uploading ? "Processando..." : "Toque para adicionar foto"}</span>
                <span className="text-xs text-stone-500">JPG, PNG ou WEBP · até 8MB</span>
              </button>
            )}
          </div>

          {/* Nome */}
          <FormField label="Nome da receita" example="Ex: Bolo de Banana Funcional" icon={Cake}>
            <Input
              data-testid="rec-name"
              value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Como você chama essa receita?"
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </FormField>

          {/* Descrição curta */}
          <FormField
            label="Descrição curta"
            example="Ex: 🍌 Sem lactose · Sem açúcar · 100% funcional"
            hint="Uma frase que descreve o diferencial da sua receita. Pode usar emojis!"
            icon={Sparkles}
          >
            <Input
              data-testid="rec-desc"
              value={form.short_description} onChange={(e) => set("short_description", e.target.value)}
              placeholder="Sem lactose, sem glúten..."
              maxLength={80}
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </FormField>

          {/* Ingredientes */}
          <FormField
            label={HINTS.ingredient_cost.label}
            example={HINTS.ingredient_cost.example}
            hint={HINTS.ingredient_cost.hint}
            icon={HINTS.ingredient_cost.icon}
            required
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">R$</span>
              <Input
                data-testid="rec-ingredient-cost"
                type="number" step="0.01" min="0"
                value={form.ingredient_cost} onChange={(e) => set("ingredient_cost", e.target.value)}
                placeholder="38,00"
                className="border-stone-800 bg-stone-900 pl-10 text-stone-50"
              />
            </div>
          </FormField>

          {/* Custos fixos */}
          <FormField
            label={HINTS.fixed_costs.label}
            example={HINTS.fixed_costs.example}
            hint={HINTS.fixed_costs.hint}
            icon={HINTS.fixed_costs.icon}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">R$</span>
              <Input
                data-testid="rec-fixed-costs"
                type="number" step="0.01" min="0"
                value={form.fixed_costs} onChange={(e) => set("fixed_costs", e.target.value)}
                placeholder="5,00"
                className="border-stone-800 bg-stone-900 pl-10 text-stone-50"
              />
            </div>
          </FormField>

          {/* Custos extras */}
          <FormField
            label={HINTS.extra_costs.label}
            example={HINTS.extra_costs.example}
            hint={HINTS.extra_costs.hint}
            icon={HINTS.extra_costs.icon}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">R$</span>
              <Input
                data-testid="rec-extra-costs"
                type="number" step="0.01" min="0"
                value={form.extra_costs} onChange={(e) => set("extra_costs", e.target.value)}
                placeholder="8,00"
                className="border-stone-800 bg-stone-900 pl-10 text-stone-50"
              />
            </div>
          </FormField>

          {/* Tempo */}
          <FormField
            label={HINTS.prep_minutes.label}
            example={HINTS.prep_minutes.example}
            hint={HINTS.prep_minutes.hint}
            icon={HINTS.prep_minutes.icon}
          >
            <Input
              data-testid="rec-prep-minutes"
              type="number" min="0"
              value={form.prep_minutes} onChange={(e) => set("prep_minutes", e.target.value)}
              placeholder="60"
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </FormField>

          {/* Ganho */}
          <FormField
            label={HINTS.desired_earning.label}
            example={HINTS.desired_earning.example}
            hint={HINTS.desired_earning.hint}
            icon={HINTS.desired_earning.icon}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">R$</span>
              <Input
                data-testid="rec-earning"
                type="number" step="0.01" min="0"
                value={form.desired_earning} onChange={(e) => set("desired_earning", e.target.value)}
                placeholder="30,00"
                className="border-stone-800 bg-stone-900 pl-10 text-stone-50"
              />
            </div>
          </FormField>

          {/* Rendimento */}
          <FormField
            label={HINTS.yield.label}
            example={HINTS.yield.example}
            hint={HINTS.yield.hint}
            icon={HINTS.yield.icon}
            required
          >
            <div className="flex gap-2">
              <Input
                data-testid="rec-yield-qty"
                type="number" step="0.01" min="0"
                value={form.yield_quantity} onChange={(e) => set("yield_quantity", e.target.value)}
                placeholder="10"
                className="w-24 border-stone-800 bg-stone-900 text-stone-50"
              />
              <Select value={form.yield_unit} onValueChange={(v) => set("yield_unit", v)}>
                <SelectTrigger data-testid="rec-yield-unit" className="flex-1 border-stone-800 bg-stone-900 text-stone-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-stone-800 bg-stone-900 text-stone-50">
                  {YIELD_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </FormField>

          {/* Vitrine settings */}
          <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-400" />
              <span className="text-xs uppercase tracking-widest font-semibold text-amber-300">Para minha vitrine</span>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-stone-100">Preço final na vitrine</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">R$</span>
                <Input
                  data-testid="rec-display-price"
                  type="number" step="0.01" min="0"
                  value={form.display_price} onChange={(e) => set("display_price", e.target.value)}
                  placeholder="Deixe vazio para usar o preço ideal"
                  className="border-stone-800 bg-stone-900 pl-10 text-stone-50"
                />
              </div>
              <p className="text-[11px] text-stone-500">Se vazio, usamos o preço ideal (recomendado).</p>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-stone-900 p-3">
              <span className="text-sm font-semibold text-stone-100">Disponível para venda</span>
              <input
                type="checkbox"
                data-testid="rec-available"
                checked={form.available}
                onChange={(e) => set("available", e.target.checked)}
                className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-stone-700 transition-all checked:bg-emerald-500 relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
              />
            </label>
          </div>
        </div>

        {/* Minhas Anotações — pessoais, só o dono vê */}
        <div className="mt-2 rounded-2xl border border-[#EED3C3] bg-[#F4E1D5]/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#8A3F21]" />
            <span className="text-xs uppercase tracking-widest font-bold text-[#8A3F21]">Minhas Anotações</span>
          </div>
          <p className="mb-2 text-[11px] text-stone-500">
            Só você vê. Anote observações de clientes, ajustes de receita, fornecedores…
          </p>
          <textarea
            data-testid="rec-notes"
            value={form.personal_notes}
            onChange={(e) => set("personal_notes", e.target.value)}
            rows={4}
            placeholder={"Ex:\n• Cliente achou muito doce → reduzir açúcar em 10%\n• Melhor fornecedor: Mercado Central\n• Rende 12 fatias grandes"}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-[#EED3C3] bg-white/60 p-3 text-sm text-[#2E1B12] placeholder:text-stone-500 focus:border-[#C96A3D] focus:outline-none focus:ring-2 focus:ring-[#C96A3D]/30"
          />
          <div className="mt-1 flex justify-end text-[10px] text-stone-500">
            {form.personal_notes.length}/2000
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          {editing && (
            <Button
              type="button"
              data-testid="rec-delete-btn"
              onClick={remove}
              variant="ghost"
              className="mr-auto text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} className="text-stone-300 hover:bg-stone-800">
            Cancelar
          </Button>
          <Button
            data-testid="rec-save-btn"
            onClick={submit}
            disabled={saving}
            className="rounded-full bg-amber-600 font-semibold text-stone-950 hover:bg-amber-700"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {editing ? "Salvar alterações" : "Calcular preço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, example, hint, icon: Icon, required, children }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-semibold text-stone-100">
          {Icon && <Icon className="h-3.5 w-3.5 text-amber-400" />}
          {label}
          {required && <span className="text-red-400">*</span>}
        </Label>
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-400"
          >
            <Info className="inline h-3 w-3" /> ajuda
          </button>
        )}
      </div>
      {children}
      {example && (
        <p className="text-[11px] italic text-stone-500">{example}</p>
      )}
      {showHint && hint && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- VITRINE VIEW ---------------- */
export function VitrineView({ recipes, onReload, onEditRecipe }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [statusRecipe, setStatusRecipe] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    api.get("/vitrine/me")
      .then((r) => setStore(r.data))
      .finally(() => setLoading(false));
  }, []);

  const publicUrl = store ? `${window.location.origin}/vitrine/${store.slug}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado!");
    } catch { toast.error("Não foi possível copiar."); }
  };

  const shareOn = (target) => {
    const msg = `Confira minha vitrine 🍰 ${publicUrl}`;
    const map = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
      instagram: null, // Instagram doesn't support direct share URL; we copy and hint
    };
    if (target === "instagram") {
      copyLink().then(() => toast.info("Link copiado! Cole na sua bio ou stories do Instagram."));
      return;
    }
    if (map[target]) window.open(map[target], "_blank");
  };

  const toggleAvailable = async (r) => {
    try {
      await api.put(`/recipes/${r.id}`, { available: !r.available });
      onReload();
    } catch { toast.error("Erro ao atualizar."); }
  };

  const saveStore = async (patch) => {
    setSaving(true);
    try {
      const { data } = await api.put("/vitrine/me", patch);
      setStore(data);
      toast.success("Vitrine atualizada!");
      setEditingStore(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar.");
    }
    setSaving(false);
  };

  const generatePDF = async () => {
    if (!store) return;
    const visible = recipes.filter((r) => r.available !== false);
    if (visible.length === 0) return toast.error("Ative pelo menos um produto.");
    setPdfBusy(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      let y = 20;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(30, 20, 10);
      pdf.text(store.store_name || "Cardápio", pageW / 2, y, { align: "center" });
      y += 8;
      if (store.tagline) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(120, 100, 80);
        pdf.text(store.tagline, pageW / 2, y, { align: "center" });
        y += 6;
      }
      if (store.whatsapp) {
        pdf.setFontSize(10);
        pdf.setTextColor(50, 130, 80);
        pdf.text(`WhatsApp: ${formatPhone(store.whatsapp)}`, pageW / 2, y, { align: "center" });
        y += 4;
      }
      y += 6;
      pdf.setDrawColor(230, 180, 120);
      pdf.setLineWidth(0.4);
      pdf.line(20, y, pageW - 20, y);
      y += 8;

      for (const r of visible) {
        if (y > 260) { pdf.addPage(); y = 20; }
        const price = displayPriceOf(r);
        // Thumb
        if (r.photo && r.photo.startsWith("data:image")) {
          try { pdf.addImage(r.photo, "JPEG", 20, y, 32, 32, undefined, "FAST"); } catch {}
        } else {
          pdf.setFillColor(250, 235, 215);
          pdf.rect(20, y, 32, 32, "F");
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(30, 20, 10);
        pdf.text(r.name, 58, y + 8);
        if (r.short_description) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(110, 90, 70);
          const lines = pdf.splitTextToSize(r.short_description, pageW - 78);
          pdf.text(lines.slice(0, 2), 58, y + 15);
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(217, 119, 6);
        pdf.text(BRL(price), 58, y + 28);
        y += 40;
      }

      pdf.setFontSize(9);
      pdf.setTextColor(160, 140, 120);
      pdf.text("Feito com Cozinha Lucrativa", pageW / 2, 285, { align: "center" });
      pdf.save(`cardapio-${store.slug}.pdf`);
      toast.success("Cardápio PDF gerado!");
    } catch (e) {
      toast.error("Erro ao gerar PDF.");
    }
    setPdfBusy(false);
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  const visibleCount = recipes.filter((r) => r.available !== false).length;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <Store className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-black text-stone-50">
            Minha <span className="italic text-emerald-400">Vitrine</span>
          </h1>
          <p className="mt-1 text-sm text-stone-400">Sua lojinha pronta para vender no WhatsApp.</p>
        </div>
      </div>

      {/* Public URL card */}
      <div className="rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-stone-900 to-stone-900 p-5">
        <p className="text-xs uppercase tracking-widest font-semibold text-emerald-300">meu link de venda</p>
        <div className="mt-2 flex items-center gap-2">
          <LinkIcon className="h-4 w-4 shrink-0 text-emerald-400" />
          <span data-testid="public-url" className="flex-1 truncate font-mono text-sm text-stone-100">{publicUrl}</span>
          <a
            data-testid="open-store-btn"
            href={publicUrl} target="_blank" rel="noreferrer"
            className="rounded-full bg-stone-800 p-2 text-stone-300 hover:bg-stone-700 hover:text-emerald-400"
            title="Abrir vitrine"
          ><ExternalLink className="h-4 w-4" /></a>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ShareBtn testId="copy-link" icon={Copy} label="Copiar" onClick={copyLink} tone="emerald" />
          <ShareBtn testId="share-whatsapp" icon={MessageCircle} label="WhatsApp" onClick={() => shareOn("whatsapp")} tone="emerald" />
          <ShareBtn testId="share-instagram" icon={Instagram} label="Instagram" onClick={() => shareOn("instagram")} tone="pink" />
          <ShareBtn testId="share-facebook" icon={Facebook} label="Facebook" onClick={() => shareOn("facebook")} tone="sky" />
        </div>
      </div>

      {/* Mensagens que Vendem (Bônus) */}
      <WhatsAppScriptsPanel store={store} phoneHint={store?.whatsapp} />

      {/* Store settings */}
      <div className="rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-stone-50">Configurações da loja</h3>
            <p className="text-xs text-stone-500">Nome, tagline e WhatsApp para pedidos</p>
          </div>
          <Button
            data-testid="edit-store-btn"
            onClick={() => setEditingStore(store)}
            variant="ghost"
            className="text-amber-300 hover:bg-stone-800"
          ><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between rounded-xl bg-stone-900 px-4 py-3">
            <span className="text-stone-500">Nome da loja</span>
            <span className="font-semibold text-stone-100">{store?.store_name || "-"}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-stone-900 px-4 py-3">
            <span className="text-stone-500">Frase de destaque</span>
            <span className="font-semibold text-stone-100">{store?.tagline || "-"}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-stone-900 px-4 py-3">
            <span className="text-stone-500">WhatsApp</span>
            <span className="font-semibold text-stone-100">{store?.whatsapp ? formatPhone(store.whatsapp) : <span className="text-red-400">falta configurar</span>}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          data-testid="pdf-btn"
          onClick={generatePDF}
          disabled={pdfBusy || visibleCount === 0}
          className="rounded-2xl bg-amber-600 py-6 text-sm font-bold text-stone-950 hover:bg-amber-700 disabled:opacity-40"
        >
          {pdfBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Cardápio em PDF
        </Button>
        <Button
          data-testid="status-btn"
          onClick={() => { if (visibleCount === 0) return toast.error("Ative pelo menos um produto."); setStatusRecipe(recipes.find((r) => r.available !== false)); }}
          disabled={visibleCount === 0}
          variant="ghost"
          className="rounded-2xl border border-emerald-500/40 bg-transparent py-6 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
        >
          <Camera className="mr-2 h-4 w-4" /> Gerar Status do Dia
        </Button>
      </div>

      {/* Products list */}
      <div className="rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-stone-50">Meus produtos na vitrine</h3>
          <span className="text-xs text-stone-500">{visibleCount} de {recipes.length} ativos</span>
        </div>
        {recipes.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            Você ainda não tem receitas. Cadastre uma na aba <b>Calculadora</b>.
          </p>
        ) : (
          <div className="space-y-2">
            {recipes.map((r) => {
              const price = displayPriceOf(r);
              return (
                <div
                  key={r.id}
                  data-testid={`vitrine-item-${r.id}`}
                  className={`flex items-center gap-3 rounded-2xl bg-stone-900 p-3 transition-opacity ${r.available === false ? "opacity-50" : ""}`}
                >
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-800">
                    {r.photo ? (
                      <img src={r.photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-stone-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-stone-100">{r.name}</div>
                    <div className="text-xs text-amber-400 font-display font-bold">{BRL(price)}</div>
                  </div>
                  <button
                    data-testid={`toggle-${r.id}`}
                    onClick={() => toggleAvailable(r)}
                    className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                      r.available === false ? "bg-stone-800 text-stone-500 hover:text-stone-300" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                    title={r.available === false ? "Ativar" : "Desativar"}
                  >
                    {r.available === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => onEditRecipe(r)}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400"
                  ><Pencil className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <StoreEditModal
        store={editingStore}
        open={!!editingStore}
        onClose={() => setEditingStore(null)}
        onSave={saveStore}
        saving={saving}
      />
      <StatusModal
        recipe={statusRecipe}
        store={store}
        recipes={recipes.filter((r) => r.available !== false)}
        onChange={setStatusRecipe}
        onClose={() => setStatusRecipe(null)}
      />
    </div>
  );
}

function ShareBtn({ testId, icon: Icon, label, onClick, tone }) {
  const toneMap = {
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    pink: "border-pink-500/40 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20",
    sky: "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20",
  }[tone];
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-semibold transition-all ${toneMap}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function displayPriceOf(r) {
  if (r.display_price != null) return Number(r.display_price);
  const c = r.computed;
  if (c?.options?.[1]) return c.options[1].price;
  const total = (Number(r.ingredient_cost) || 0) + (Number(r.fixed_costs) || 0) + (Number(r.extra_costs) || 0);
  return (total + (Number(r.desired_earning) || 0)) * 1.20;
}

function formatPhone(digits) {
  const d = String(digits || "").replace(/\D/g, "");
  if (d.length < 10) return d;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return d;
}

/* ---------- Store settings modal ---------- */
function StoreEditModal({ store, open, onClose, onSave, saving }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [wa, setWa] = useState("");
  const [intro, setIntro] = useState("");

  useEffect(() => {
    if (open && store) {
      setSlug(store.slug || "");
      setName(store.store_name || "");
      setTagline(store.tagline || "");
      setWa(store.whatsapp || "");
      setIntro(store.intro_message || "");
    }
  }, [open, store]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="store-modal"
        className="border-stone-800 bg-stone-950 text-stone-50 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Configurar minha vitrine</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Nome da loja" example="Ex: Doces da Maria" icon={Store}>
            <Input
              data-testid="store-name-input"
              value={name} onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Doces da Maria"
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </FormField>
          <FormField label="Frase de destaque" example="Ex: Feitos sob encomenda" icon={Sparkles}>
            <Input
              data-testid="store-tagline-input"
              value={tagline} onChange={(e) => setTagline(e.target.value)}
              maxLength={80}
              placeholder="Feitos sob encomenda"
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </FormField>
          <FormField
            label="Meu link"
            example={`Sua vitrine ficará em .../vitrine/${slug || "seu-nome"}`}
            hint="Use apenas letras minúsculas, números e hífens. Sem espaços."
            icon={LinkIcon}
          >
            <div className="flex items-center gap-1 rounded-xl border border-stone-800 bg-stone-900 px-3">
              <span className="text-xs text-stone-500">/vitrine/</span>
              <Input
                data-testid="store-slug-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="seunome"
                maxLength={30}
                className="border-0 bg-transparent p-0 text-stone-50 focus-visible:ring-0"
              />
            </div>
          </FormField>
          <FormField
            label="WhatsApp para pedidos"
            example="Ex: 11 98765-4321 (DDD + número)"
            hint="Coloque com DDD. Podemos usar +55 automático."
            icon={MessageCircle}
            required
          >
            <Input
              data-testid="store-wa-input"
              value={wa} onChange={(e) => setWa(e.target.value.replace(/\D/g, ""))}
              placeholder="11987654321"
              maxLength={20}
              inputMode="numeric"
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </FormField>
          <FormField
            label="Saudação do WhatsApp"
            example="Ex: Olá Maria, tudo bem?"
            hint="Frase que aparecerá antes do pedido do cliente. Deixe vazio para usar padrão."
          >
            <Input
              data-testid="store-intro-input"
              value={intro} onChange={(e) => setIntro(e.target.value)}
              placeholder="Olá! Tudo bem?"
              maxLength={300}
              className="border-stone-800 bg-stone-900 text-stone-50"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-stone-300 hover:bg-stone-800">Cancelar</Button>
          <Button
            data-testid="store-save-btn"
            onClick={() => onSave({ slug, store_name: name, tagline, whatsapp: wa, intro_message: intro })}
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

/* ---------- Status generator ---------- */
function StatusModal({ recipe, store, recipes, onChange, onClose }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!recipe) return null;
  const price = displayPriceOf(recipe);

  const download = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#faf4ea",
      });
      const link = document.createElement("a");
      link.download = `status-${recipe.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Status salvo! Agora é só postar 📸");
    } catch (e) {
      toast.error("Erro ao gerar imagem.");
    }
    setBusy(false);
  };

  return (
    <Dialog open={!!recipe} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="status-modal"
        className="max-h-[92vh] overflow-y-auto border-stone-800 bg-stone-950 text-stone-50 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Status de hoje</DialogTitle>
          <p className="text-sm text-stone-400">Baixe a imagem e poste no seu status.</p>
        </DialogHeader>

        {recipes.length > 1 && (
          <Select value={recipe.id} onValueChange={(v) => onChange(recipes.find((r) => r.id === v))}>
            <SelectTrigger className="border-stone-800 bg-stone-900 text-stone-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-stone-800 bg-stone-900 text-stone-50">
              {recipes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Status card preview (rendered element - used for image capture) */}
        <div className="overflow-hidden rounded-3xl">
          <div
            ref={cardRef}
            data-testid="status-card"
            className="relative aspect-[9/16] w-full overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600"
            style={{ maxHeight: 500 }}
          >
            {recipe.photo && (
              <img src={recipe.photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
            <div className="relative flex h-full flex-col p-6 text-white">
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/80">encomende hoje</div>
              <div className="mt-2 text-3xl font-black leading-tight" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>
                {recipe.name}
              </div>
              {recipe.short_description && (
                <div className="mt-2 text-base font-medium text-white/90 leading-snug">
                  {recipe.short_description}
                </div>
              )}
              <div className="mt-auto space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/70">a partir de</div>
                  <div className="text-5xl font-black" style={{ fontFamily: "Playfair Display, Georgia, serif" }}>
                    {BRL(price)}
                  </div>
                </div>
                {store?.whatsapp && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
                    <span>📱</span> Peça pelo WhatsApp
                  </div>
                )}
                <div className="text-xs font-semibold text-white/70">
                  {store?.store_name}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-stone-300 hover:bg-stone-800">Fechar</Button>
          <Button
            data-testid="status-download-btn"
            onClick={download}
            disabled={busy}
            className="rounded-full bg-emerald-500 font-semibold text-white hover:bg-emerald-600"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Baixar imagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- EARNINGS VIEW (dashboard) ---------------- */
function EarningsView() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/pricing/dashboard"), api.get("/pricing/history")])
      .then(([a, b]) => { setData(a.data); setHistory(b.data || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  const empty = !data || (data.month_revenue === 0 && data.month_profit === 0 && history.length === 0);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-start gap-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <TrendingUp className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-black text-stone-50">
            Meus <span className="italic text-emerald-400">Ganhos</span>
          </h1>
          <p className="mt-1 text-sm text-stone-400">Acompanhe seu faturamento, lucro e receitas de destaque.</p>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-stone-800 bg-stone-900/30 px-8 py-14 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-stone-900">
            <BarChart3 className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="font-display text-xl font-bold text-stone-50">Ainda sem ganhos registrados</h3>
          <p className="mt-2 max-w-sm text-sm text-stone-400">
            Precifique uma receita e salve o preço escolhido. O resultado aparece aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DashCard testId="dash-revenue" icon={DollarSign} label="Faturamento do mês" value={BRL(data.month_revenue || 0)} accent="emerald" />
            <DashCard testId="dash-profit" icon={TrendingUp} label="Lucro estimado do mês" value={BRL(data.month_profit || 0)} accent="amber" />
            <DashCard
              testId="dash-topprofit"
              icon={Sparkles} label="Receita mais lucrativa"
              value={data.most_profitable?.recipe_name || "-"}
              sub={data.most_profitable ? BRL(data.most_profitable.profit) : "sem dados"}
              accent="sky"
            />
            <DashCard
              testId="dash-topsell"
              icon={Cake} label="Mais vendida"
              value={data.best_selling?.recipe_name || "-"}
              sub={data.best_selling ? `${data.best_selling.quantity} unid.` : "sem dados"}
              accent="fuchsia"
            />
          </div>

          <div className="rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-stone-50">Últimos orçamentos</h3>
              <span className="text-xs text-stone-500">{history.length} salvos</span>
            </div>
            {history.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">Nenhum orçamento salvo.</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 10).map((h) => (
                  <div
                    key={h.id}
                    data-testid={`history-${h.id}`}
                    className="flex items-center justify-between rounded-xl bg-stone-900 px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-stone-100">{h.recipe_name}</div>
                      <div className="text-xs text-stone-500">
                        {new Date(h.created_at).toLocaleDateString("pt-BR")}
                        {h.level && ` · ${labelFor(h.level).toLowerCase()}`}
                        {h.margin != null && ` · margem ${Math.round(h.margin * 100)}%`}
                      </div>
                    </div>
                    <div className="font-display text-lg font-black text-amber-400">{BRL(h.chosen_price || h.suggested_price || 0)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DashCard({ testId, icon: Icon, label, value, sub, accent }) {
  const c = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    sky: "bg-sky-500/10 text-sky-400",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-400",
  }[accent];
  return (
    <div data-testid={testId} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
      <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${c}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs uppercase tracking-widest text-stone-500">{label}</p>
      <div className="mt-1 font-display text-xl font-black text-stone-50">{value}</div>
      {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
    </div>
  );
}
