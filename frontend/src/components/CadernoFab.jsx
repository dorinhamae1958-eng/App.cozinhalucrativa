import React, { useState } from "react";
import { NotebookPen, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import QuickNoteWidget from "@/components/QuickNoteWidget";

/**
 * Botão flutuante do Meu Caderno.
 * Renderizado só nas telas de estudo (curso/módulos/player) para que
 * a aluna possa anotar sem sair da aula.
 */
export default function CadernoFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="caderno-fab"
        aria-label="Abrir Meu Caderno"
        title="Meu Caderno · anotar sem sair da aula"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full py-3 pl-4 pr-5 text-white shadow-[0_8px_24px_rgba(138,63,33,0.45)] transition-transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
      >
        <NotebookPen className="h-5 w-5" strokeWidth={2.2} />
        <span className="text-[11px] font-black uppercase tracking-widest">
          Meu Caderno
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          data-testid="caderno-fab-sheet"
          className="w-full overflow-y-auto border-l border-[#EED3C3] bg-[#FAF6F0] px-5 py-6 text-[#2E1B12] sm:max-w-md"
        >
          <SheetHeader className="mb-4 flex-row items-start justify-between gap-3 space-y-0 text-left">
            <div className="flex items-start gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
                style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
              >
                <NotebookPen className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <SheetTitle className="font-display text-xl font-black leading-tight text-[#2E1B12]">
                  Meu <span className="italic" style={{ color: "#B98A2E" }}>Caderno</span>
                </SheetTitle>
                <p className="mt-0.5 text-[11px] text-[#8A3F21]/80">
                  anote sem sair da aula
                </p>
              </div>
            </div>
          </SheetHeader>
          <QuickNoteWidget compact />
        </SheetContent>
      </Sheet>
    </>
  );
}
