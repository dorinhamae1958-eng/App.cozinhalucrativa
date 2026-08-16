import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Plus, Trash2, Ticket, ShieldAlert, RefreshCw, Users2,
  ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";

const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso; }
};
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR"); } catch { return iso; }
};

export default function AccessCodesAdmin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState("");
  const [copied, setCopied] = useState("");

  const [form, setForm] = useState({ code: "", discount_pct: "100", max_uses: "", expires_at: "", note: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/access-codes");
      setItems(data.items || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao carregar códigos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/affiliates/me");
        setIsAdmin(!!data.is_admin);
        if (data.is_admin) await load();
      } catch {
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.code.trim().length < 2) { toast.error("Informe o código."); return; }
    setCreating(true);
    try {
      await api.post("/access-codes", {
        code: form.code.trim(),
        discount_pct: form.discount_pct === "" ? 100 : Number(form.discount_pct),
        max_uses: form.max_uses === "" ? undefined : Number(form.max_uses),
        expires_at: form.expires_at || undefined,
        note: form.note || undefined,
      });
      toast.success("Código criado!");
      setForm({ code: "", discount_pct: "100", max_uses: "", expires_at: "", note: "" });
      await load();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || "Erro ao criar código.");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (c, active) => {
    try { await api.patch(`/access-codes/${c}`, { active }); await load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao atualizar."); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Remover o código ${c}?`)) return;
    try { await api.delete(`/access-codes/${c}`); toast.success("Código removido."); await load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao remover."); }
  };

  const copyCode = async (c) => {
    try { await navigator.clipboard.writeText(c); setCopied(c); setTimeout(() => setCopied(""), 1500); }
    catch { /* ignore */ }
  };

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center" style={{ background: "#FAF6F0" }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#8A3F21]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div data-testid="codes-restricted" className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "#FAF6F0" }}>
        <ShieldAlert className="h-12 w-12 text-[#B91C1C]" />
        <h1 className="font-display text-2xl font-bold text-[#2E1B12]">Área restrita</h1>
        <p className="max-w-md text-sm text-[#5F4A3F]">Este painel é exclusivo da administradora.</p>
        <Button onClick={() => navigate("/")} className="rounded-full px-6 text-white" style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}>Voltar ao início</Button>
      </div>
    );
  }

  return (
    <div data-testid="access-codes-admin-page" className="min-h-[calc(100vh-4rem)] px-6 py-12 lg:px-12" style={{ background: "#FAF6F0" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#EED3C3] bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7A3E9D]">
              <Ticket className="h-3.5 w-3.5" /> Códigos de Acesso
            </div>
            <h1 className="font-display text-3xl font-black text-[#2E1B12]">Códigos VIP (100% off)</h1>
            <p className="mt-1 text-sm text-[#5F4A3F]">Libere acesso gratuito com controle de usos, validade e registro de quem usou.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/afiliados" className="inline-flex items-center rounded-full border border-[#EED3C3] bg-white px-4 py-2 text-xs font-bold text-[#8A3F21] hover:bg-[#F4E1D5]">Afiliados</Link>
            <Button data-testid="refresh-codes" variant="outline" onClick={load} disabled={loading} className="rounded-full border-[#EED3C3] text-[#8A3F21]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Criar código */}
        <form onSubmit={handleCreate} data-testid="create-code-form" className="mt-8 rounded-[24px] border border-[#EED3C3] bg-white/85 p-6">
          <p className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-[#2E1B12]"><Plus className="h-4 w-4 text-[#7A3E9D]" /> Novo código</p>
          <div className="grid gap-3 md:grid-cols-5 md:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#7A3E9D]">Código</label>
              <Input data-testid="code-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VIP100" className="h-11 rounded-xl border-[#EED3C3] bg-white font-mono text-[#2E1B12]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#7A3E9D]">Desconto %</label>
              <Input data-testid="code-discount" type="number" min="0" max="100" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} className="h-11 rounded-xl border-[#EED3C3] bg-white text-[#2E1B12]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#7A3E9D]">Limite de usos</label>
              <Input data-testid="code-max-uses" type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="ilimitado" className="h-11 rounded-xl border-[#EED3C3] bg-white text-[#2E1B12]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#7A3E9D]">Validade</label>
              <Input data-testid="code-expires" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="h-11 rounded-xl border-[#EED3C3] bg-white text-[#2E1B12]" />
            </div>
            <Button data-testid="submit-code" type="submit" disabled={creating} className="h-11 rounded-full px-6 font-bold text-white" style={{ background: "linear-gradient(135deg,#7A3E9D,#5B2E76)" }}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </form>

        {/* Lista */}
        <div className="mt-8 space-y-3">
          {items.length === 0 && (
            <div className="rounded-[24px] border border-[#EED3C3] bg-white/85 px-4 py-10 text-center text-[#7D6656]">Nenhum código ainda. Crie o primeiro acima.</div>
          )}
          {items.map((c) => {
            const remaining = c.max_uses ? `${c.remaining}/${c.max_uses}` : "ilimitado";
            return (
              <div key={c.code} data-testid={`code-row-${c.code}`} className="rounded-[24px] border border-[#EED3C3] bg-white/85 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => copyCode(c.code)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F0E6F5] px-3 py-1.5 font-mono text-sm font-bold text-[#5B2E76]">
                      {copied === c.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {c.code}
                    </button>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${c.usable ? "bg-[#E5F4E8] text-[#1F7A3D]" : "bg-[#FBE9E9] text-[#B91C1C]"}`}>
                      {c.usable ? "Ativo" : "Indisponível"}
                    </span>
                    <span className="text-[11px] font-bold text-[#7A3E9D]">{c.discount_pct}% off</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button data-testid={`toggle-${c.code}`} onClick={() => toggleActive(c.code, !c.active)} className="rounded-full border border-[#EED3C3] px-3 py-1.5 text-[11px] font-bold text-[#8A3F21] hover:bg-[#F4E1D5]">
                      {c.active ? "Desativar" : "Ativar"}
                    </button>
                    <button data-testid={`delete-code-${c.code}`} onClick={() => remove(c.code)} className="grid h-8 w-8 place-items-center rounded-lg text-[#B91C1C] hover:bg-[#FBE9E9]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#5F4A3F] sm:grid-cols-4">
                  <div><span className="block text-[10px] uppercase tracking-wide text-[#8A3F21]">Usos</span><b className="text-[#2E1B12]">{c.used_count} usados</b></div>
                  <div><span className="block text-[10px] uppercase tracking-wide text-[#8A3F21]">Restantes</span><b className="text-[#2E1B12]">{remaining}</b></div>
                  <div><span className="block text-[10px] uppercase tracking-wide text-[#8A3F21]">Validade</span><b className="text-[#2E1B12]">{fmtDate(c.expires_at)}</b></div>
                  <div><span className="block text-[10px] uppercase tracking-wide text-[#8A3F21]">Criado</span><b className="text-[#2E1B12]">{fmtDate(c.created_at)}</b></div>
                </div>

                <button
                  data-testid={`expand-${c.code}`}
                  onClick={() => setExpanded(expanded === c.code ? "" : c.code)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5B2E76]"
                >
                  <Users2 className="h-3.5 w-3.5" /> {c.redemptions.length} resgate(s)
                  {expanded === c.code ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {expanded === c.code && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-[#F0E1D5]">
                    {c.redemptions.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-[#7D6656]">Ninguém usou este código ainda.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead><tr className="bg-[#FBF3EA] text-[10px] uppercase text-[#8A3F21]"><th className="px-3 py-2">E-mail beneficiado</th><th className="px-3 py-2">Data</th></tr></thead>
                        <tbody>
                          {c.redemptions.map((r, i) => (
                            <tr key={i} className="border-t border-[#F0E1D5]">
                              <td className="px-3 py-2 text-[#2E1B12]">{r.email}</td>
                              <td className="px-3 py-2 text-[#5F4A3F]">{fmtDateTime(r.ts)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
