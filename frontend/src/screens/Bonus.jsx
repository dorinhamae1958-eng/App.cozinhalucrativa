import React, { useState } from "react";
import { Sparkles, Palette, DollarSign, ArrowLeft, ExternalLink, BookOpen, Heart, Zap, Trophy, Shield, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BONUSES = [
  {
    id: "primeira-venda-7-dias",
    local: true,
    fileUrl: "/bonus/primeira-venda-7-dias.pdf",
    cover: "/bonus/primeira-venda-7-dias-capa.webp",
    title: "Primeira Venda em 7 Dias",
    tagline: "Guia iniciante",
    type: "pdf",
    icon: TrendingUp,
    description:
      "O passo a passo definitivo para confeiteiras iniciantes transformarem a paixão em renda lucrativa: receitas práticas, dicas de ouro e o método completo para fazer sua primeira venda em uma semana.",
  },
  {
    id: "hamburgao-lucrativo-apostila",
    local: true,
    fileUrl: "/apostilas/hamburgao-lucrativo-apostila.pdf",
    title: "Base Profissional para Hamburguer",
    tagline: "Curso bônus",
    type: "pdf",
    icon: BookOpen,
    description:
      "Apostila completa do curso de Hambúrguer Artesanal: do preparo da carne ao ponto ideal do pão. 10 aulas com técnica profissional, precificação e estratégias de venda para delivery de ticket alto.",
  },
  {
    id: "rocamboles-lucrativos-apostila",
    local: true,
    fileUrl: "/apostilas/rocamboles-lucrativos-apostila.pdf",
    title: "Base Profissional para Rocamboles",
    tagline: "Curso bônus",
    type: "pdf",
    icon: BookOpen,
    description:
      "Apostila completa do curso de Rocamboles: as receitas mais vendidas do Brasil, técnica profissional de enrolamento, recheios cremosos e precificação. 7 aulas para vender por encomenda ou em vitrine.",
  },
  {
    id: "1-OP22nuAFqV_GvsKpZXD5qCTNbMGZY1c",
    title: "Guia – Delivery de Iogurte",
    tagline: "Estratégia de vendas",
    type: "pdf",
    icon: TrendingUp,
    description:
      "Apostila estratégica para vender iogurtes gourmet em delivery: rotas, embalagem, precificação para entrega, atendimento no WhatsApp e o passo a passo para fidelizar clientes que recompram toda semana.",
  },
  {
    id: "1YfUU9quDtjMmwQOlQoOEg3f7dFADYaGP",
    title: "Como criar seu logotipo",
    tagline: "Marca",
    type: "video",
    icon: Palette,
    description:
      "Desenhe um logotipo profissional para sua marca, sem depender de designer. Ferramentas, princípios e passo a passo.",
  },
  {
    id: "11nWgvTEPgRkXEm2843n04Xvs_8g6_6zI",
    title: "A Felicidade Começa com Você",
    tagline: "Desenvolvimento pessoal",
    type: "pdf",
    icon: Heart,
    description:
      "E-book sobre como cultivar felicidade genuína a partir do seu dia a dia.",
  },
  {
    id: "11qyQlVlQI14U57cvz3v8anOu1eMWlKVC",
    title: "O Poder da Gratidão",
    tagline: "Mentalidade",
    type: "pdf",
    icon: Sparkles,
    description:
      "Como o hábito diário de agradecer transforma sua mentalidade e seus resultados.",
  },
  {
    id: "11XD10O-7X5WaM14gnSIB8dEGzu5n3Zin",
    title: "Como Aumentar Sua Produtividade",
    tagline: "Alta performance",
    type: "pdf",
    icon: Zap,
    description:
      "Técnicas de foco e rotina para produzir mais em menos tempo.",
  },
  {
    id: "11O9SF88tBKGuEQ8WE_o7w9Orq3La4k_S",
    title: "Você Nasceu para Vencer",
    tagline: "Motivação",
    type: "pdf",
    icon: Trophy,
    description:
      "Mentalidade de vencedor aplicada ao empreendedorismo e à vida.",
  },
];

export default function Bonus({ initialId }) {
  const [activeId, setActiveId] = useState(initialId || BONUSES[0].id);
  const active = BONUSES.find((b) => b.id === activeId) || BONUSES[0];
  const ActiveIcon = active.icon;

  return (
    <div
      data-testid="bonus-page"
      className="min-h-screen"
      style={{ background: "linear-gradient(180deg, #FAF6F0 0%, #F4E1D5 100%)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-12 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            to="/"
            data-testid="bonus-back"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A3F21] hover:text-[#5A2A15]"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7C9A9] bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#8A3F21]">
            <Sparkles className="h-3.5 w-3.5" /> Bônus incluídos · todos os cursos
          </span>
        </div>

        <div className="mb-2 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: "#A24D2A" }}>
          Bônus universais
        </div>
        <h1
          className="font-display text-4xl font-black leading-tight md:text-5xl"
          style={{ color: "#2E1B12" }}
        >
          Conteúdos de <span className="italic" style={{ color: "#A24D2A" }}>negócio e sucesso</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: "#5F4A3F" }}>
          Aulas e e-books universais: marca, produtividade, gratidão, mentalidade e
          felicidade. Aparecem no módulo <b>Bônus Extra</b> de todos os cursos que
          você acessa.
        </p>

        <Link
          to="/materiais"
          data-testid="bonus-to-materiais"
          className="mt-4 inline-flex items-center gap-2 rounded-full border-2 px-5 py-2 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
          style={{ borderColor: "#A24D2A", color: "#A24D2A", background: "rgba(255,255,255,0.6)" }}
        >
          <Shield className="h-3.5 w-3.5" /> Já colocou em prática? Ver Materiais para imprimir
        </Link>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.5fr]">
          {/* LISTA DE BÔNUS */}
          <div className="flex flex-col gap-4">
            {BONUSES.map((b) => {
              const Icon = b.icon;
              const isActive = b.id === activeId;
              return (
                <button
                  key={b.id}
                  data-testid={`bonus-card-${b.tagline.toLowerCase()}`}
                  onClick={() => setActiveId(b.id)}
                  className={`text-left rounded-2xl border p-5 transition-all ${
                    isActive
                      ? "border-[#A24D2A] bg-white shadow-lg"
                      : "border-[#EED3C3] bg-white/60 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-11 w-11 flex-none place-items-center rounded-lg text-white"
                      style={{ background: "linear-gradient(135deg,#A24D2A,#8A3F21)" }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.25em]"
                        style={{ color: "#A24D2A" }}
                      >
                        {b.tagline}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-bold" style={{ color: "#2E1B12" }}>
                        {b.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: "#5F4A3F" }}>
                        {b.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            <Button
              asChild
              variant="ghost"
              className="mt-2 self-start rounded-full border border-[#E7C9A9] px-5 text-sm font-semibold text-[#8A3F21] hover:bg-[#F4E1D5]"
            >
              <Link to="/meus-cursos">Ver meus cursos</Link>
            </Button>
          </div>

          {/* PLAYER ATIVO */}
          <div>
            <div
              className="overflow-hidden rounded-2xl border shadow-2xl"
              style={{ borderColor: "#EED3C3", background: "#0f0d0b" }}
            >
              <div className={`relative ${active.local && active.cover ? "aspect-[4/5] md:aspect-[3/4]" : "aspect-video"}`}>
                {active.local && active.cover ? (
                  <a
                    data-testid="bonus-cover-open"
                    href={active.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group absolute inset-0 block"
                    title={`Abrir ${active.title}`}
                    style={{ background: "linear-gradient(180deg,#FAF6F0 0%,#F4E1D5 100%)" }}
                  >
                    <img
                      src={active.cover}
                      alt={active.title}
                      className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-90 drop-shadow">E-book · PDF</p>
                        <p className="mt-0.5 truncate font-display text-lg font-bold drop-shadow-lg">{active.title}</p>
                      </div>
                      <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[#8A3F21] shadow-lg transition group-hover:bg-white group-hover:scale-105">
                        <BookOpen className="h-3.5 w-3.5" /> Abrir e-book
                      </span>
                    </div>
                  </a>
                ) : active.local ? (
                  <iframe
                    data-testid="bonus-iframe"
                    key={active.id}
                    src={`${active.fileUrl}#view=FitH&toolbar=1`}
                    title={active.title}
                    className="absolute inset-0 h-full w-full bg-white"
                  />
                ) : (
                  <iframe
                    data-testid="bonus-iframe"
                    key={active.id}
                    src={`https://drive.google.com/file/d/${active.id}/preview`}
                    title={active.title}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border p-4"
              style={{ borderColor: "#EED3C3", background: "rgba(255,255,255,0.6)" }}
            >
              <div
                className="grid h-9 w-9 flex-none place-items-center rounded-lg text-white"
                style={{ background: "linear-gradient(135deg,#A24D2A,#8A3F21)" }}
              >
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold" style={{ color: "#2E1B12" }}>
                  {active.title}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#5F4A3F" }}>
                  {active.description}
                </p>
              </div>
              <a
                data-testid="bonus-open-drive"
                href={active.local ? active.fileUrl : `https://drive.google.com/file/d/${active.id}/view`}
                target="_blank"
                rel="noreferrer"
                download={active.local ? undefined : undefined}
                className="inline-flex flex-none items-center gap-1.5 rounded-full border border-[#E7C9A9] bg-white px-3 py-1.5 text-xs font-semibold text-[#8A3F21] hover:bg-[#F4E1D5]"
              >
                {active.local ? "Baixar" : "Abrir"} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
