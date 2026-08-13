import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Lightbulb, Loader2, Pencil, Search, NotebookPen, Cake,
} from "lucide-react";
import { RecipeModal } from "@/pages/Calculadora";
import QuickNoteWidget from "@/components/QuickNoteWidget";

/**
 * Página dedicada a "Minhas Anotações".
 * Lista todas as receitas do usuário, destacando as que já têm anotações
 * e permitindo abrir cada uma pra editar direto o campo Minhas Anotações.
 */
export default function MinhasAnotacoes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/recipes");
      setRecipes(data || []);
    } catch {
      toast.error("Não foi possível carregar suas receitas.");
      setRecipes([]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openRecipe = (r) => {
    setEditing(r);
    setModalOpen(true);
  };

  const filtered = recipes.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      (r.personal_notes || "").toLowerCase().includes(q)
    );
  });

  const withNotes = filtered.filter((r) => (r.personal_notes || "").trim().length > 0);
  const withoutNotes = filtered.filter((r) => !(r.personal_notes || "").trim().length);

  return (
    <div data-testid="minhas-anotacoes-page" className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#F4E1D5] text-[#8A3F21]">
          <NotebookPen className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-black leading-tight text-stone-50">
            Meu <span className="italic text-amber-400">Caderno</span>
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Anotações do dia a dia — receitas, clientes, fornecedores, ideias e lembretes. Só você vê.
          </p>
        </div>
      </div>

      {/* Widget de anotações rápidas com IA */}
      <div className="mb-8">
        <QuickNoteWidget />
      </div>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3 px-1">
        <span className="h-px flex-1 bg-stone-800" />
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-500">
          Anotações por receita
        </span>
        <span className="h-px flex-1 bg-stone-800" />
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyStateNoRecipes />
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              data-testid="notes-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por receita ou palavra na anotação…"
              className="border-stone-800 bg-stone-900 pl-9 text-stone-50 placeholder:text-stone-500"
            />
          </div>

          {/* Notes list */}
          {withNotes.length === 0 && withoutNotes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-800 bg-stone-900/30 py-10 text-center text-sm text-stone-500">
              Nenhuma receita encontrada.
            </p>
          ) : (
            <>
              {withNotes.length > 0 && (
                <div className="mb-6 space-y-3">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span className="text-xs uppercase tracking-widest text-stone-500">
                      Com anotações
                    </span>
                    <span className="text-xs text-stone-500">
                      {withNotes.length} {withNotes.length === 1 ? "receita" : "receitas"}
                    </span>
                  </div>
                  {withNotes.map((r) => (
                    <NoteCard key={r.id} recipe={r} onEdit={openRecipe} />
                  ))}
                </div>
              )}

              {withoutNotes.length > 0 && (
                <div className="space-y-2">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span className="text-xs uppercase tracking-widest text-stone-500">
                      Sem anotações ainda
                    </span>
                    <span className="text-xs text-stone-500">
                      {withoutNotes.length}
                    </span>
                  </div>
                  {withoutNotes.map((r) => (
                    <EmptyNoteRow key={r.id} recipe={r} onEdit={openRecipe} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <RecipeModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); setEditing(null); load(); }}
        onDeleted={() => { setModalOpen(false); setEditing(null); load(); }}
      />
    </div>
  );
}

function NoteCard({ recipe, onEdit }) {
  return (
    <div
      data-testid={`note-card-${recipe.id}`}
      className="rounded-3xl border border-[#EED3C3] bg-[#F4E1D5]/80 p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/70">
            {recipe.photo ? (
              <img src={recipe.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Cake className="h-5 w-5 text-[#8A3F21]" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-black text-[#2E1B12]">
              {recipe.name}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8A3F21]">
              <Lightbulb className="h-3 w-3" />
              Minhas Anotações
            </div>
          </div>
        </div>
        <Button
          data-testid={`edit-note-${recipe.id}`}
          onClick={() => onEdit(recipe)}
          variant="ghost"
          className="h-8 shrink-0 rounded-full bg-white/70 px-3 text-xs font-semibold text-[#8A3F21] hover:bg-white"
        >
          <Pencil className="mr-1 h-3 w-3" /> Editar
        </Button>
      </div>
      <p
        data-testid={`note-content-${recipe.id}`}
        className="whitespace-pre-wrap text-sm leading-relaxed text-[#2E1B12]"
      >
        {recipe.personal_notes}
      </p>
    </div>
  );
}

function EmptyNoteRow({ recipe, onEdit }) {
  return (
    <div
      data-testid={`empty-note-row-${recipe.id}`}
      className="flex items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900/40 p-3"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-900">
        {recipe.photo ? (
          <img src={recipe.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <Cake className="h-4 w-4 text-stone-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-stone-100">{recipe.name}</div>
        <div className="text-[11px] text-stone-500">Ainda sem anotações</div>
      </div>
      <Button
        data-testid={`add-note-${recipe.id}`}
        onClick={() => onEdit(recipe)}
        variant="ghost"
        className="h-8 shrink-0 rounded-full border border-stone-800 bg-stone-900 px-3 text-xs font-semibold text-amber-300 hover:bg-stone-800"
      >
        <Pencil className="mr-1 h-3 w-3" /> Anotar
      </Button>
    </div>
  );
}

function EmptyStateNoRecipes() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#EED3C3] bg-[#F4E1D5]/80 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/70 text-[#8A3F21]">
            <Cake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-black text-[#2E1B12]">
              Exemplo de anotação
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8A3F21]">
              <Lightbulb className="h-3 w-3" />
              Minhas Anotações
            </div>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#2E1B12]">
          Cliente achou muito doce.{"\n"}
          Reduzir açúcar em 10%.{"\n\n"}
          Melhor fornecedor:{"\n"}
          Mercado Central.
        </p>
      </div>
      <p className="px-2 text-center text-xs text-stone-500">
        Cadastre uma receita na aba <span className="font-semibold text-amber-400">Calculadora</span> para começar a anotar as suas.
      </p>
    </div>
  );
}
