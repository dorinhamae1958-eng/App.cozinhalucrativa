import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section
      data-testid="not-found-page"
      className="flex min-h-[70vh] items-center justify-center px-6 py-16"
      style={{ background: "#FAF6F0" }}
    >
      <div className="mx-auto max-w-lg text-center">
        <div
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl text-white shadow-[0_10px_30px_rgba(138,63,33,0.35)]"
          style={{ background: "linear-gradient(135deg, #A24D2A 0%, #8A3F21 100%)" }}
        >
          <ChefHat className="h-7 w-7" strokeWidth={2.5} />
        </div>

        <p
          className="mb-2 text-xs font-bold uppercase tracking-[0.28em]"
          style={{ color: "#8A3F21" }}
        >
          erro 404
        </p>
        <h1
          className="font-display text-4xl font-black leading-tight sm:text-5xl"
          style={{ color: "#2E1B12" }}
        >
          Esta página saiu do forno.
        </h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: "#4A3529" }}>
          Não encontramos o endereço que você tentou acessar. Ele pode ter sido
          movido ou nunca ter existido. Volte para o início e continue a jornada.
        </p>

        <div className="mt-8 flex items-center justify-center">
          <Link to="/">
            <Button
              data-testid="not-found-back-btn"
              className="rounded-full px-8 py-6 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_12px_40px_rgba(217,119,6,0.35)] transition-all hover:shadow-[0_18px_60px_rgba(217,119,6,0.5)]"
              style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
