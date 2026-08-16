import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, BRL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Plus, Copy, Trash2, Users, MousePointerClick, ShoppingBag,
  DollarSign, BadgePercent, Link2, ShieldAlert, Check, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#EED3C3] bg-white/85 px-4 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: "linear-gradient(135deg,#A24D2A,#8A3F21)" }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A3F21]">{label}</p>
        <p className="font-display text-lg font-black text-[#2E1B12]">{value}</p>
      </div>
    </div>
  );
}

export default function AffiliatesAdmin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ clicks: 0, sales: 0, revenue: 0, commission: 0 });
  const [defaultPct, setDefaultPct] = useState(40);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("40");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/affiliates");
      setItems(data.items || []);
      setTotals(data.totals || { clicks: 0, sales: 0, revenue: 0, commission: 0 });
      setDefaultPct(data.default_commission_pct ?? 40);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao carregar afiliados.");
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
    if (name.trim().length < 2) { toast.error("Informe o nome do afiliado."); return; }
    setCreating(true);
    try {
      await api.post("/affiliates", {
        name: name.trim(),
        code: code.trim() || undefined,
        commission_pct: pct === "" ? undefined : Number(pct),
      });
      toast.success("Afiliado criado!");
      setName(""); setCode(""); setPct(String(defaultPct));
      await load();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || "Erro ao criar afiliado.");
    } finally {
      setCreating(false);
    }
  };

  const affiliateLink = (c) => `${window.location.origin}/?ref=${c}`;

  const copyLink = async (c) => {
    try {
      await navigator.clipboard.writeText(affiliateLink(c));
      setCopied(c);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(""), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const saveCommission = async (c, newPct) => {
    const val = Number(newPct);
    if (Number.isNaN(val) || val < 0 || val > 100) { toast.error("Comissão inválida (0–100)."); return; }
    try {
      await api.patch(`/affiliates/${c}`, { commission_pct: val });
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao atualizar.");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Remover o afiliado ${c}? As vendas registradas continuam no histórico.`)) return;
    try {
      await api.delete(`/affiliates/${c}`);
      toast.success("Afiliado removido.");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao remover.");
    }
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
      <div data-testid="affiliates-restricted" className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "#FAF6F0" }}>
        <ShieldAlert className="h-12 w-12 text-[#B91C1C]" />
        <h1 className="font-display text-2xl font-bold text-[#2E1B12]">Área restrita</h1>
        <p className="max-w-md text-sm text-[#5F4A3F]">Este painel é exclusivo da administradora.</p>
        <Button onClick={() => navigate("/")} className="rounded-full px-6 text-white" style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}>Voltar ao início</Button>
      </div>
    );
  }

  return (
    <div data-testid="affiliates-admin-page" className="min-h-[calc(100vh-4rem)] px-6 py-12 lg:px-12" style={{ background: "#FAF6F0" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#EED3C3] bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8A3F21]">
              <Users className="h-3.5 w-3.5" /> Painel de Afiliados
            </div>
            <h1 className="font-display text-3xl font-black text-[#2E1B12]">Afiliados & Comissões</h1>
            <p className="mt-1 text-sm text-[#5F4A3F]">Crie links, acompanhe vendas e calcule a comissão de cada indicação.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/codigos" className="inline-flex items-center rounded-full border border-[#EED3C3] bg-white px-4 py-2 text-xs font-bold text-[#7A3E9D] hover:bg-[#F4E1D5]">Códigos VIP</Link>
            <Button data-testid="refresh-affiliates" variant="outline" onClick={load} disabled={loading} className="rounded-full border-[#EED3C3] text-[#8A3F21]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Totais */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={MousePointerClick} label="Cliques" value={totals.clicks} />
          <Stat icon={ShoppingBag} label="Vendas" value={totals.sales} />
          <Stat icon={DollarSign} label="Receita" value={BRL(totals.revenue || 0)} />
          <Stat icon={BadgePercent} label="Comissão total" value={BRL(totals.commission || 0)} />
        </div>

        {/* Criar afiliado */}
        <form onSubmit={handleCreate} data-testid="create-affiliate-form" className="mt-8 rounded-[24px] border border-[#EED3C3] bg-white/85 p-6">
          <p className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-[#2E1B12]"><Plus className="h-4 w-4 text-[#8A3F21]" /> Novo afiliado</p>
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_0.7fr_auto] md:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#8A3F21]">Nome</label>
              <Input data-testid="affiliate-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Silva" className="h-11 rounded-xl border-[#EED3C3] bg-white text-[#2E1B12]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#8A3F21]">Código (opcional)</label>
              <Input data-testid="affiliate-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Gerado do nome" className="h-11 rounded-xl border-[#EED3C3] bg-white text-[#2E1B12]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#8A3F21]">Comissão %</label>
              <Input data-testid="affiliate-pct" type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} className="h-11 rounded-xl border-[#EED3C3] bg-white text-[#2E1B12]" />
            </div>
            <Button data-testid="submit-affiliate" type="submit" disabled={creating} className="h-11 rounded-full px-6 font-bold text-white" style={{ background: "linear-gradient(135deg,#D97706,#A24D2A)" }}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </form>

        {/* Lista */}
        <div className="mt-8 overflow-hidden rounded-[24px] border border-[#EED3C3] bg-white/85">
          <div className="overflow-x-auto">
            <table data-testid="affiliates-table" className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#EED3C3] text-[11px] uppercase tracking-wide text-[#8A3F21]">
                  <th className="px-4 py-3">Afiliado</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3 text-center">Cliques</th>
                  <th className="px-4 py-3 text-center">Vendas</th>
                  <th className="px-4 py-3 text-right">Receita</th>
                  <th className="px-4 py-3 text-center">Comissão %</th>
                  <th className="px-4 py-3 text-right">A pagar</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-[#7D6656]">Nenhum afiliado ainda. Crie o primeiro acima.</td></tr>
                )}
                {items.map((a) => (
                  <tr key={a.code} data-testid={`affiliate-row-${a.code}`} className="border-b border-[#F0E1D5] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#2E1B12]">{a.name}</p>
                      <p className="text-[11px] font-mono text-[#8A3F21]">{a.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button data-testid={`copy-link-${a.code}`} onClick={() => copyLink(a.code)} className="inline-flex items-center gap-1.5 rounded-full border border-[#EED3C3] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#8A3F21] hover:bg-[#F4E1D5]">
                        {copied === a.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied === a.code ? "Copiado" : "Copiar link"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#2E1B12]">{a.clicks}</td>
                    <td className="px-4 py-3 text-center font-semibold text-[#2E1B12]">{a.sales}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#2E1B12]">{BRL(a.revenue)}</td>
                    <td className="px-4 py-3 text-center">
                      <Input
                        data-testid={`pct-${a.code}`}
                        type="number" min="0" max="100" defaultValue={a.commission_pct}
                        onBlur={(e) => { if (Number(e.target.value) !== a.commission_pct) saveCommission(a.code, e.target.value); }}
                        className="mx-auto h-9 w-20 rounded-lg border-[#EED3C3] bg-white text-center text-[#2E1B12]"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#8A3F21]">{BRL(a.commission)}</td>
                    <td className="px-4 py-3 text-center">
                      <button data-testid={`delete-${a.code}`} onClick={() => remove(a.code)} className="grid h-8 w-8 place-items-center rounded-lg text-[#B91C1C] hover:bg-[#FBE9E9]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-[11px] text-[#7D6656]">
          <Link2 className="h-3.5 w-3.5" /> O link do afiliado (<b>?ref=CODIGO</b>) atribui a venda automaticamente — no Mercado Pago e no Stripe. A comissão é paga manualmente por você.
        </p>
      </div>
    </div>
  );
}
