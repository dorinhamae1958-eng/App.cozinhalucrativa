import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { VitrineView, RecipeModal } from "@/pages/Calculadora";

export default function MinhaVitrine() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/recipes");
      setRecipes(data || []);
    } catch { setRecipes([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="minha-vitrine-page" className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">
      <VitrineView
        recipes={recipes}
        onReload={load}
        onEditRecipe={(rec) => { setEditing(rec); setModalOpen(true); }}
      />

      <RecipeModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load(); }}
        onDeleted={() => { setModalOpen(false); load(); }}
      />
    </div>
  );
}
