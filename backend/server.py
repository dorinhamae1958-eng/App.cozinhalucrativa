"""
FastAPI proxy that forwards all /api/* requests to the Next.js server
running on localhost:3000. This is required because the Emergent
platform ingress routes /api paths to port 8001 (this backend), while
the actual Next.js API routes live on port 3000.

Rotas iniciadas em /api/ai/* são interceptadas ANTES do proxy e servidas
diretamente por Python (para consumir emergentintegrations).
"""
import os
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse

load_dotenv()

from ai_routes import router as ai_router
from plantao_routes import router as plantao_router
from payment_routes import router as payment_router
from mp_routes import router as mp_router
from affiliate_routes import router as affiliate_router
from access_code_routes import router as access_code_router
from setup_stripe import run_setup as run_stripe_setup

NEXT_URL = "http://localhost:3000"

app = FastAPI(title="Next.js API Proxy")

# IA endpoints (Python-only, não passam pelo proxy).
app.include_router(ai_router)
# Plantão de Dúvidas (Python-only, não passa pelo proxy).
app.include_router(plantao_router)
# Pagamentos (Stripe Checkout) — atendidos direto no FastAPI.
app.include_router(payment_router)
# Pagamentos (Mercado Pago Checkout Pro) — gateway principal.
app.include_router(mp_router)
# Sistema de afiliados (admin).
app.include_router(affiliate_router)
# Códigos de acesso social (cupom VIP 100% off) — admin.
app.include_router(access_code_router)


@app.on_event("startup")
async def _bootstrap_stripe():
    # Garante que o produto/preço R$57 exista no Stripe. Idempotente.
    try:
        run_stripe_setup()
    except Exception:
        # Falha aqui não deve derrubar o backend; o checkout vai avisar depois.
        import logging
        logging.getLogger(__name__).exception("Stripe bootstrap falhou.")

# Long-lived async HTTP client
client = httpx.AsyncClient(base_url=NEXT_URL, timeout=60.0)


@app.on_event("shutdown")
async def _shutdown():
    await client.aclose()


HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-encoding",
    "content-length",
}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(path: str, request: Request):
    url = f"/api/{path}"
    body = await request.body()

    # Filter hop-by-hop headers
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP and k.lower() != "host"}

    upstream = None
    try:
        upstream = await client.request(
            request.method,
            url,
            params=request.query_params,
            headers=headers,
            content=body,
        )
    except httpx.RequestError:
        return Response(content='{"error":"Next.js server unavailable"}', status_code=502, media_type="application/json")
    except Exception:
        return Response(content='{"error":"Upstream proxy error"}', status_code=502, media_type="application/json")

    if upstream is None:
        return Response(content='{"error":"Upstream proxy error"}', status_code=502, media_type="application/json")

    response_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP}
    return Response(content=upstream.content, status_code=upstream.status_code, headers=response_headers)


@app.get("/")
async def root():
    return {"status": "ok", "service": "nextjs-api-proxy"}
