import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ShieldCheck, Clock } from "lucide-react";

const DOCS = {
  termos: {
    icon: FileText,
    kicker: "documento legal",
    title: "Termos de Uso",
    sections: [
      {
        heading: "Aceitação dos termos",
        body:
          "Ao acessar a Cozinha Lucrativa você concorda com estes termos. Se não concordar, por favor não utilize a plataforma.",
      },
      {
        heading: "Uso do conteúdo",
        body:
          "Todo o material do aplicativo (aulas, e-books, receitas, calculadora, kits de marketing) é destinado ao uso pessoal do aluno. Não é permitida a redistribuição, revenda ou reprodução comercial do conteúdo sem autorização escrita.",
      },
      {
        heading: "Conta e acesso",
        body:
          "Cada acesso é individual. Compartilhar credenciais pode resultar em bloqueio. Durante a fase beta, algumas funcionalidades podem estar abertas para validação e podem mudar sem aviso prévio.",
      },
      {
        heading: "Suporte",
        body:
          "Dúvidas, problemas de acesso ou pedidos de melhoria podem ser encaminhados pelo e-mail de suporte disponível no rodapé.",
      },
      {
        heading: "Alterações",
        body:
          "Estes termos podem ser atualizados a qualquer momento. A versão vigente será sempre a publicada nesta página.",
      },
    ],
  },
  privacidade: {
    icon: ShieldCheck,
    kicker: "documento legal",
    title: "Política de Privacidade",
    sections: [
      {
        heading: "Quais dados coletamos",
        body:
          "Coletamos apenas o necessário para operar o aplicativo: nome, e-mail e foto de perfil vindos do login com Google, além dos dados que você mesmo cadastra (produtos da vitrine, encomendas, anotações e progresso de aulas).",
      },
      {
        heading: "Como usamos os dados",
        body:
          "Utilizamos suas informações para autenticar o acesso, salvar seu progresso, personalizar sua experiência e nos comunicar com você sobre atualizações relevantes do produto. Nunca vendemos dados a terceiros.",
      },
      {
        heading: "Compartilhamento",
        body:
          "Dados podem ser processados por provedores de infraestrutura (autenticação, banco de dados, hospedagem) exclusivamente para fazer a plataforma funcionar. Todos operam sob acordo de confidencialidade.",
      },
      {
        heading: "Seus direitos",
        body:
          "Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato pelo e-mail de suporte. Atendemos aos pedidos de acordo com a Lei Geral de Proteção de Dados (LGPD).",
      },
      {
        heading: "Cookies e armazenamento local",
        body:
          "Usamos cookies apenas para manter sua sessão logada e lembrar preferências básicas. Não fazemos rastreamento publicitário.",
      },
    ],
  },
};

export default function LegalDoc() {
  const location = useLocation();
  const kind = location.pathname.replace("/", "");
  const doc = DOCS[kind] || DOCS.termos;
  const Icon = doc.icon;

  return (
    <section
      data-testid={`legal-doc-${kind}`}
      className="min-h-[70vh] px-6 py-16 md:px-12"
      style={{ background: "#FAF6F0" }}
    >
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          data-testid="legal-back-link"
          className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:opacity-70"
          style={{ color: "#8A3F21" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao início
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-[0_10px_30px_rgba(138,63,33,0.35)]"
            style={{ background: "linear-gradient(135deg, #A24D2A 0%, #8A3F21 100%)" }}
          >
            <Icon className="h-6 w-6" strokeWidth={2.4} />
          </div>
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: "#8A3F21" }}
            >
              {doc.kicker}
            </p>
            <h1
              className="font-display text-3xl font-black leading-tight sm:text-4xl"
              style={{ color: "#2E1B12" }}
            >
              {doc.title}
            </h1>
          </div>
        </div>

        <div
          data-testid="legal-status-banner"
          className="mb-10 flex items-start gap-3 rounded-2xl border px-5 py-4"
          style={{
            borderColor: "rgba(217, 119, 6, 0.35)",
            background: "rgba(217, 119, 6, 0.08)",
          }}
        >
          <Clock className="mt-0.5 h-4 w-4 flex-none" style={{ color: "#A24D2A" }} />
          <p className="text-sm leading-relaxed" style={{ color: "#4A3529" }}>
            <b style={{ color: "#8A3F21" }}>Documento em elaboração.</b>{" "}
            O texto abaixo é uma versão provisória enquanto finalizamos a redação
            oficial. Você pode continuar usando a plataforma normalmente. Em caso
            de dúvidas, escreva para o e-mail de suporte no rodapé.
          </p>
        </div>

        <div className="space-y-8">
          {doc.sections.map((sec) => (
            <div key={sec.heading}>
              <h2
                className="mb-2 font-display text-xl font-bold"
                style={{ color: "#2E1B12" }}
              >
                {sec.heading}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "#4A3529" }}>
                {sec.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Link to="/">
            <Button
              data-testid="legal-back-btn"
              className="rounded-full px-8 py-6 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_12px_40px_rgba(217,119,6,0.35)] transition-all hover:shadow-[0_18px_60px_rgba(217,119,6,0.5)]"
              style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
          </Link>
        </div>

        <p
          className="mt-10 text-center text-[11px]"
          style={{ color: "#8A7566" }}
        >
          Última atualização: versão beta · {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>
    </section>
  );
}
