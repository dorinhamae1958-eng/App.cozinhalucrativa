"""
Seed idempotente dos códigos promocionais 100% gratuitos.

Roda no startup do backend. Só INSERE códigos ausentes (via $setOnInsert),
nunca sobrescreve `used_count`, `active` ou histórico de códigos já existentes.
Códigos 100% liberam acesso direto (access_grants), sem Mercado Pago e sem
gerar comissão de afiliado.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Nome do código -> limite de usos (max_uses). discount_pct sempre 100 (grátis).
PROMO_CODES = [
    {"code": "VIP100", "max_uses": 20, "note": "Convite VIP (grátis)"},
    {"code": "PASTOR100", "max_uses": 50, "note": "Cortesia Pastor (grátis)"},
    {"code": "CONVIDADO100", "max_uses": 100, "note": "Convidado (grátis)"},
]


def run_seed() -> None:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc)
    for entry in PROMO_CODES:
        code = entry["code"].upper()
        db.access_codes.update_one(
            {"code": code},
            {
                "$setOnInsert": {
                    "code": code,
                    "discount_pct": 100.0,
                    "max_uses": int(entry["max_uses"]),
                    "used_count": 0,
                    "expires_at": None,
                    "plan": "full",
                    "note": entry["note"],
                    "active": True,
                    "created_at": now,
                }
            },
            upsert=True,
        )
    logger.info("Seed de códigos promocionais concluído (idempotente).")
    client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seed()
    print("OK — códigos promocionais garantidos.")
