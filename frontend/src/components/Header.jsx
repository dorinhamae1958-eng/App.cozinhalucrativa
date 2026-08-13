import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useJourneyStatus } from "@/hooks/use-journey-status";
import { Button } from "@/components/ui/button";
import {
  ChefHat, LogOut, User as UserIcon, Crown, Award,
  BookOpen, DollarSign, Palette, ChevronDown, Sparkles,
  MessageCircleQuestion,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PlantaoNotificationBell from "@/components/PlantaoNotificationBell";
import { NAV_GROUPS as NAV_GROUPS_DATA } from "@/lib/nav-groups";

/**
 * Cabeçalho reorganizado em 3 grupos que refletem a jornada da
 * confeiteira empreendedora:
 *   Aprender → Vender → Minha Marca.
 *
 * A árvore vem de `@/lib/nav-groups` (fonte única) e aqui apenas anexamos
 * o componente de ícone via `iconKey`.
 */
const ICON_MAP = { book: BookOpen, dollar: DollarSign, palette: Palette };
const NAV_GROUPS = NAV_GROUPS_DATA.map((g) => ({ ...g, icon: ICON_MAP[g.iconKey] }));

const NAV_TRIGGER_CLASS =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-[#2E1B12] transition-all hover:bg-[#F4E1D5] hover:text-[#8A3F21] data-[state=open]:bg-[#F4E1D5] data-[state=open]:text-[#8A3F21]";
const MENU_ITEM_CLASS =
  "cursor-pointer gap-2 px-3 py-2 text-[13px] font-semibold focus:bg-[#F4E1D5] focus:text-[#8A3F21]";

function isGroupActive(group, pathname) {
  return group.items.some((it) => pathname.startsWith(it.to));
}

function NavGroup({ group, showcase }) {
  const navigate = useNavigate();
  const location = useLocation();
  const Icon = group.icon;
  const active = isGroupActive(group, location.pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button data-testid={group.testId} className={NAV_TRIGGER_CLASS} style={active ? { backgroundColor: "#F4E1D5", color: "#8A3F21" } : {}}>
          <Icon className="h-4 w-4" strokeWidth={2.2} />
          {group.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      {showcase ? (
        <DropdownMenuContent
          align="start"
          sideOffset={10}
          className="w-[340px] border-[#EED3C3] bg-[#FAF6F0] p-0 text-[#2E1B12] shadow-2xl"
        >
          <div className="px-4 pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#8A3F21]/80">
              {group.subtitle}
            </p>
            <p className="mt-1 font-display text-lg leading-tight text-[#2E1B12]">
              {group.tagline}
            </p>
          </div>
          <div className="h-px w-full bg-[#EED3C3]" />
          <ul className="space-y-1 p-2">
            {group.items.map((it) => (
              <li
                key={it.to}
                data-testid={`${it.testId}-showcase`}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#F4E1D5]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg shadow-inner"
                  style={{ backgroundColor: "#F4E1D5" }}
                >
                  {it.emoji}
                </span>
                <div className="leading-snug">
                  <p className="text-[13px] font-bold text-[#2E1B12]">{it.label}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5F4A3F]">
                    {it.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="h-px w-full bg-[#EED3C3]" />
        </DropdownMenuContent>
      ) : (
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-60 border-[#EED3C3] bg-[#FAF6F0] text-[#2E1B12] shadow-xl"
        >
          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-[#8A3F21]/70">
            {group.subtitle}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#EED3C3]" />
          {group.items.map((it) => (
            <DropdownMenuItem
              key={it.to}
              data-testid={it.testId}
              onClick={() => navigate(it.to)}
              className={MENU_ITEM_CLASS}
            >
              <span className="text-base leading-none">{it.emoji}</span>
              <span>{it.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

function UserAvatar({ user, grandCompleted }) {
  const seal = grandCompleted && (
    <div
      data-testid="user-seal"
      title="Empreendedora Renda Lucrativa"
      className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md"
    >
      <Crown className="h-2.5 w-2.5" strokeWidth={3} />
    </div>
  );
  return (
    <div className="relative">
      {user.picture ? (
        <img src={user.picture} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <div className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ backgroundColor: "#A24D2A" }}>
          <UserIcon className="h-4 w-4" />
        </div>
      )}
      {seal}
    </div>
  );
}

export default function Header() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { grandCompleted } = useJourneyStatus(user);

  // Na landing pública (usuária ainda não logada e/ou navegando pelo /), os
  // dropdowns viram cartões explicativos que descrevem o que cada área faz —
  // sem abrir a página real, que exige login.
  const showcaseMode = !user && (location.pathname === "/" || location.pathname === "/entrar" || location.pathname === "/login" || location.pathname === "/planos");

  // Páginas públicas (landing/entrar/planos) mostram "Entrar com Google".
  // Nas páginas internas o CTA vira "Sair" e retorna ao Dashboard (/meus-cursos),
  // nunca à página de vendas.
  const onPublicPage =
    location.pathname === "/" ||
    location.pathname.startsWith("/entrar") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/planos");

  // Flat list para o menu mobile / user dropdown
  const flatItems = NAV_GROUPS.flatMap((g) =>
    g.items.map((it) => ({ ...it, groupLabel: g.label }))
  );

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 w-full border-b border-[#EED3C3]/60 bg-[#FAF6F0]/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-12">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2.5 group">
          <div
            className="grid h-9 w-9 place-items-center rounded-lg text-white shadow-[0_4px_16px_rgba(138,63,33,0.35)] transition-transform group-hover:scale-105"
            style={{ background: "linear-gradient(135deg, #A24D2A 0%, #8A3F21 100%)" }}
          >
            <ChefHat className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-black tracking-tight" style={{ color: "#2E1B12" }}>
              Cozinha Lucrativa
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#8A3F21" }}>
              aplicativo · renda extra
            </span>
          </div>
        </Link>

        {!showcaseMode && (
          <nav data-testid="main-nav" className="hidden items-center gap-2 md:flex">
            {NAV_GROUPS.map((g) => (
              <NavGroup key={g.id} group={g} showcase={showcaseMode} />
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && <PlantaoNotificationBell />}
          {!user ? (
            onPublicPage ? (
              <Button
                data-testid="login-btn"
                onClick={() => navigate("/entrar")}
                className="rounded-full px-6 font-semibold text-white shadow-[0_4px_16px_rgba(162,77,42,0.35)] transition-all"
                style={{ backgroundColor: "#A24D2A" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#8A3F21"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#A24D2A"}
              >
                Entrar
              </Button>
            ) : (
              <Button
                data-testid="exit-btn"
                onClick={() => navigate("/meus-cursos")}
                className="rounded-full px-6 font-semibold text-white shadow-[0_4px_16px_rgba(162,77,42,0.35)] transition-all"
                style={{ backgroundColor: "#A24D2A" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#8A3F21"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#A24D2A"}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </Button>
            )
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="user-menu-btn"
                  className="flex items-center gap-2 rounded-full border border-[#EED3C3] bg-white/70 px-2 py-1.5 pr-3 transition-colors hover:border-[#D89A5B]"
                >
                  <UserAvatar user={user} grandCompleted={grandCompleted} />
                  <span className="hidden text-sm font-semibold text-[#2E1B12] sm:block">
                    {user.name?.split(" ")[0]}
                  </span>
                  {grandCompleted && (
                    <span className="hidden items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow md:inline-flex">
                      <Crown className="h-2.5 w-2.5" /> Renda Lucrativa
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 border-[#EED3C3] bg-[#FAF6F0] text-[#2E1B12] shadow-xl"
              >
                <DropdownMenuLabel className="text-[#5F4A3F] text-xs">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#EED3C3]" />
                {/* Mobile: mostra todos os itens agrupados */}
                <div className="md:hidden">
                  {NAV_GROUPS.map((g) => (
                    <div key={g.id} className="py-1">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-[#8A3F21]/70">
                        {g.label}
                      </div>
                      {g.items.map((it) => (
                        <DropdownMenuItem
                          key={it.to}
                          data-testid={`${it.testId}-mobile`}
                          onClick={() => navigate(it.to)}
                          className={MENU_ITEM_CLASS}
                        >
                          <span className="text-base leading-none">{it.emoji}</span>
                          {it.label}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                  <DropdownMenuSeparator className="bg-[#EED3C3]" />
                </div>
                {grandCompleted && (
                  <DropdownMenuItem
                    data-testid="menu-journey-certificate"
                    onClick={() => navigate("/jornada/certificado")}
                    className={MENU_ITEM_CLASS}
                  >
                    <Award className="mr-2 h-4 w-4 text-amber-600" /> Meu Certificado
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-testid="menu-perfil"
                  onClick={() => navigate("/perfil")}
                  className={MENU_ITEM_CLASS}
                >
                  <Sparkles className="mr-2 h-4 w-4" style={{ color: "#8A3F21" }} /> Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="menu-logout"
                  onClick={logout}
                  className="cursor-pointer focus:bg-red-50 focus:text-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
