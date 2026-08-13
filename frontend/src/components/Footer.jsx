import React from "react";
import { ChefHat, Mail, FileText, ShieldCheck } from "lucide-react";

// Contatos provisórios da fase beta.
// Atualize conforme os canais oficiais forem criados.
const CONTACT = {
  email: "suporte@cozinhalucrativa.com.br",
  whatsapp: null, // ex.: "(11) 90000-0000"
  cnpj: null,     // ex.: "00.000.000/0001-00"
};

const LEGAL_LINKS = [
  { label: "Termos de Uso", to: "/termos", icon: FileText, testId: "footer-termos" },
  { label: "Política de Privacidade", to: "/privacidade", icon: ShieldCheck, testId: "footer-privacidade" },
];

export default function Footer() {
  return (
    <footer
      data-testid="app-footer"
      className="mt-32 border-t border-[#EED3C3]/50 bg-[#FAF6F0] py-12 text-[#2E1B12]"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-3 md:px-12">
        {/* Brand */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-9 w-9 place-items-center rounded-lg text-white shadow-[0_4px_16px_rgba(138,63,33,0.35)]"
              style={{ background: "linear-gradient(135deg, #A24D2A 0%, #8A3F21 100%)" }}
            >
              <ChefHat className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-base font-bold" style={{ color: "#2E1B12" }}>
                Cozinha Lucrativa
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#8A3F21" }}>
                aplicativo · renda extra
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[#5F4A3F]">
            Aprenda receitas profissionais, descubra quanto cobrar e organize
            seu negócio em um único aplicativo.
          </p>
        </div>

        {/* Legal */}
        <div>
          <p
            className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ color: "#8A3F21" }}
          >
            institucional
          </p>
          <ul className="space-y-2">
            {LEGAL_LINKS.map(({ label, to, icon: Icon, testId }) => (
              <li key={to}>
                <a
                  href={to}
                  data-testid={testId}
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-[#A24D2A]"
                  style={{ color: "#4A3529" }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contato & Suporte */}
        <div>
          <p
            className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ color: "#8A3F21" }}
          >
            contato & suporte
          </p>
          <ul className="space-y-2 text-sm" style={{ color: "#4A3529" }}>
            <li className="flex items-center gap-2" data-testid="footer-email">
              <Mail className="h-3.5 w-3.5" />
              {CONTACT.email ? (
                <a href={`mailto:${CONTACT.email}`} className="font-medium hover:text-[#A24D2A]">
                  {CONTACT.email}
                </a>
              ) : (
                <span className="text-[#8A7566]">E-mail em breve</span>
              )}
            </li>
          </ul>
        </div>
      </div>

      <div
        className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-[#EED3C3]/60 px-6 pt-6 text-[11px] md:flex-row md:px-12"
        style={{ color: "#8A7566" }}
      >
        <p>© {new Date().getFullYear()} Cozinha Lucrativa. Todos os direitos reservados.</p>
        {CONTACT.cnpj && <p data-testid="footer-cnpj">CNPJ {CONTACT.cnpj}</p>}
      </div>
    </footer>
  );
}
