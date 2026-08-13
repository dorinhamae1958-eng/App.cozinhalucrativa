import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Bell, MessageCircleHeart } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TERRA = "#A24D2A";
const TERRA_DARK = "#8A3F21";
const CREAM = "#FAF6F0";
const BORDER = "#EED3C3";
const INK = "#2E1B12";
const INK_MUTED = "#5F4A3F";
const HONEY = "#D89A5B";

export default function PlantaoNotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    api.get("/plantao/notifications")
      .then((r) => { setItems(r.data.items || []); setUnread(r.data.unread_count || 0); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 60000); // poll a cada 60s
    return () => clearInterval(t);
  }, [user, load]);

  const markAll = async () => {
    try { await api.post("/plantao/notifications/mark-all-read"); load(); } catch {}
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="notification-bell"
          className="relative grid h-9 w-9 place-items-center rounded-full border transition-colors hover:bg-[#F4E1D5]"
          style={{ borderColor: BORDER, background: "#fff" }}
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" style={{ color: TERRA_DARK }} strokeWidth={2.2} />
          {unread > 0 && (
            <span
              data-testid="notification-bell-count"
              className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full px-1 text-[9px] font-black text-white"
              style={{ background: HONEY }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 border p-0" style={{ borderColor: BORDER, background: "#FFFDF9" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: BORDER }}>
          <p className="font-display text-sm font-black" style={{ color: INK }}>Notificações</p>
          {unread > 0 && (
            <button onClick={markAll} className="text-[11px] font-semibold hover:underline" style={{ color: TERRA_DARK }} data-testid="mark-all-read">
              Marcar todas como lidas
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageCircleHeart className="mx-auto h-6 w-6" style={{ color: HONEY }} />
            <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>Sem novidades por enquanto.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto" data-testid="notification-list">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  to="/plantao"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-left transition-colors hover:bg-[#FAF6F0]"
                  style={{ background: n.read ? "transparent" : "#FEF7EF" }}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: HONEY }} />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold" style={{ color: INK }}>{n.message}</p>
                      <p className="mt-0.5 text-[11px]" style={{ color: INK_MUTED }}>{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
