"""
Setup Stripe (idempotente) — cria o produto e o preço da Cozinha Lucrativa.

Executa uma vez no boot do backend para garantir que o catálogo esteja em dia
mesmo depois de rebuilds/forks. Roda a partir do server.py.
"""
from __future__ import annotations

import logging
import os

import stripe

logger = logging.getLogger(__name__)

# Catálogo único: acesso R$57 à vista (one-time)
CATALOG = [
    {
        "emergent_product_id": "cozinha_lucrativa_anual",
        "name": "Cozinha Lucrativa · Acesso 12 meses",
        "description": (
            "Acesso completo ao aplicativo Cozinha Lucrativa — cursos, "
            "calculadora de lucro, vitrine, encomendas, caderno de anotações, "
            "kit de marketing e plantão de dúvidas por 12 meses."
        ),
        "tax_code": "txcd_10000000",  # digital goods (genérico)
        "prices": [
            {
                "lookup_key": "cozinha_lucrativa_57",
                "amount": 5700,  # cents (R$ 57,00)
                "currency": "brl",
                # sem "interval" → one-time
            },
        ],
    },
]


def get_or_create_product(entry: dict):
    for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
        meta = p.to_dict().get("metadata") or {}
        if meta.get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(
        name=entry["name"],
        description=entry.get("description"),
        tax_code=entry.get("tax_code"),
        metadata={
            "managed_by": "emergent",
            "emergent_product_id": entry["emergent_product_id"],
        },
    )


def ensure_price(product, price_entry: dict):
    existing = stripe.Price.list(
        lookup_keys=[price_entry["lookup_key"]], active=True, limit=1
    ).data
    if existing:
        p = existing[0]
        if p.unit_amount != price_entry["amount"] or p.currency != price_entry["currency"]:
            stripe.Price.modify(p.id, active=False)
            existing = []
    if existing:
        return existing[0]

    kwargs = dict(
        product=product.id,
        unit_amount=price_entry["amount"],
        currency=price_entry["currency"],
        lookup_key=price_entry["lookup_key"],
        transfer_lookup_key=True,
    )
    if price_entry.get("interval"):
        kwargs["recurring"] = {"interval": price_entry["interval"]}
    return stripe.Price.create(**kwargs)


def run_setup():
    secret = os.environ.get("STRIPE_SECRET_KEY")
    if not secret:
        logger.warning("STRIPE_SECRET_KEY não configurado — pulando setup.")
        return False
    stripe.api_key = secret

    try:
        for entry in CATALOG:
            product = get_or_create_product(entry)
            for pr in entry["prices"]:
                ensure_price(product, pr)
        logger.info("Stripe catalog OK (produto + preços em dia).")
        return True
    except Exception:
        logger.exception("Falha ao configurar catálogo Stripe.")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ok = run_setup()
    print("setup_stripe:", "ok" if ok else "fail")
