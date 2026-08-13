import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Shield, Tag, Gift } from "lucide-react";

import "@/components/materiais/materiais.css";
import { BrandProvider } from "@/context/BrandContext";
import BrandIdentityForm from "@/components/materiais/BrandIdentityForm";
import EmblemasTab from "@/components/materiais/EmblemasTab";
import RotulosTab from "@/components/materiais/RotulosTab";
import CartoesTab from "@/components/materiais/CartoesTab";

const TABS = [
  { id: "emblemas", label: "Emblemas & Logos", Icon: Shield },
  { id: "rotulos",  label: "Rótulos",           Icon: Tag },
  { id: "cartoes",  label: "Cartões",           Icon: Gift },
];

export default function Materiais() {
  const [tab, setTab] = useState("emblemas");

  return (
    <BrandProvider>
      <div
        data-testid="materiais-page"
        className="min-h-screen"
        style={{ background: "linear-gradient(180deg, #FAF6F0 0%, #F4E1D5 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-12 md:py-16">
          {/* Header da página */}
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              to="/"
              data-testid="materiais-back"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A3F21] hover:text-[#5A2A15]"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E7C9A9] bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#8A3F21]">
              <Sparkles className="h-3.5 w-3.5" /> Kit da marca · pronto para vender
            </span>
          </div>

          <div className="mb-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: "#A24D2A" }}>
            Kit da marca
          </div>
          <h1 className="font-display text-4xl font-black leading-tight md:text-5xl" style={{ color: "#2E1B12" }}>
            Sua marca, <span className="italic" style={{ color: "#A24D2A" }}>pronta para vender</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: "#5F4A3F" }}>
            Cadastre a identidade da sua marca uma única vez. Todos os materiais (emblemas, rótulos, cartões e
            fidelidade) usam esses dados automaticamente e ficam prontos para imprimir em A4.
          </p>

          {/* Passo 1: Form de identidade */}
          <div className="mt-8">
            <BrandIdentityForm />
          </div>

          {/* Passo 2: Escolha o material */}
          <div className="mb-2 mt-4 text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "#A24D2A" }}>
            Passo 2 · Escolha o material
          </div>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="materiais-tabs">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                data-testid={`tab-${id}`}
                className={`mat-tab ${tab === id ? "active" : ""}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="mt-8" data-testid={`materiais-panel-${tab}`}>
            {tab === "emblemas" && <EmblemasTab />}
            {tab === "rotulos"  && <RotulosTab />}
            {tab === "cartoes"  && <CartoesTab />}
          </div>
        </div>
      </div>
    </BrandProvider>
  );
}
