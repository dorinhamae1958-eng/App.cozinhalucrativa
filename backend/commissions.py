"""
Regras de comissão de afiliados — Cozinha Lucrativa (v1, A/B fixo).

NÃO alterar estas taxas sem decisão de negócio. Regras definitivas:

- VENDA DIRETA (afiliado geração A): A recebe 50% · Plataforma 50%.
- VENDA DE UM AFILIADO B: B recebe 30% · o A indicador (parent) recebe 30% ·
  Plataforma 40%.
  A comissão do A sobre a venda do B é automática (independe de o A vender),
  identificada pelo parent_affiliate_id/parent_code do B.

Comissão só é DEFINITIVA quando o pagamento está aprovado
(MP "approved" / Stripe "paid"). Pendente/recusado/cancelado/estornado = void.
"""
from __future__ import annotations

# Taxas fixas (v1). Não usar percentuais por afiliado para o cálculo do repasse.
DIRECT_A_SELLER_RATE = 0.50  # A vende direto → A recebe 50%
B_SELLER_RATE = 0.30         # B vende → B recebe 30%
B_PARENT_RATE = 0.30         # ...e o A indicador recebe 30%

APPROVED_STATES = {"approved", "paid"}


def _r(v: float) -> float:
    return round(float(v or 0.0), 2)


def compute_commission(amount: float, seller_generation: str | None, has_parent: bool) -> dict:
    """Divide o valor de UMA venda entre vendedor, indicador e plataforma."""
    amount = float(amount or 0.0)
    gen = (seller_generation or "A").upper()
    if gen == "B":
        seller = _r(amount * B_SELLER_RATE)
        parent = _r(amount * B_PARENT_RATE) if has_parent else 0.0
    else:  # A — venda direta
        seller = _r(amount * DIRECT_A_SELLER_RATE)
        parent = 0.0
    platform = _r(amount - seller - parent)
    return {
        "seller_commission": seller,
        "indicador_commission": parent,
        "platform_amount": platform,
    }


def assemble_sale_record(
    amount: float,
    seller_code: str | None,
    seller_generation: str | None,
    indicador_code: str | None,
    indicador_generation: str | None,
    status: str | None,
) -> dict:
    """Monta o registro de comissão de uma venda. Comissão só conta se aprovada."""
    approved = str(status or "").lower() in APPROVED_STATES
    if approved and seller_code:
        b = compute_commission(amount, seller_generation, bool(indicador_code))
        seller_c, ind_c, plat = b["seller_commission"], b["indicador_commission"], b["platform_amount"]
        cstatus = "confirmed"
    else:
        seller_c = ind_c = 0.0
        plat = _r(amount) if approved else 0.0
        cstatus = "confirmed" if approved else "void"
    return {
        "gross_amount": _r(amount),
        "net_amount": _r(amount),
        "seller_code": seller_code,
        "seller_generation": (seller_generation or None),
        "indicador_code": indicador_code or None,
        "indicador_generation": (indicador_generation or None),
        "seller_commission": seller_c,
        "indicador_commission": ind_c,
        "platform_amount": plat,
        "commission_status": cstatus,
    }
