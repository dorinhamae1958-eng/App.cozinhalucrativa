"""
Rotas de IA (Claude Sonnet 4.6 via Emergent Universal Key).

Executadas DENTRO do FastAPI antes do proxy — o `server.py` mata a chamada
aqui e nunca encaminha para o Next.js.

Endpoints:
  POST /api/ai/slogan               → gera 1 slogan curto
  POST /api/ai/product-description  → gera descrição comercial curta
"""
import os
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage


router = APIRouter(prefix="/api/ai", tags=["ai"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-6"

STYLE_HINT = {
    "minimal": "linguagem minimalista, elegante e discreta. Fugir de clichês.",
    "boutique": "linguagem boutique, aconchegante e sofisticada, com toque afetivo.",
    "artesanal": "linguagem artesanal, autoral e caseira, com pegada humana e mão-na-massa.",
}


class SloganRequest(BaseModel):
    brand_name: str = Field(..., min_length=1, max_length=60)
    language: str = "boutique"      # minimal | boutique | artesanal
    city: str | None = None
    specialty: str | None = None    # ex.: "confeitaria", "bolos caseiros"


class SloganResponse(BaseModel):
    slogan: str


class ProductDescRequest(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=80)
    tagline: str | None = None
    language: str = "boutique"
    brand_name: str | None = None


class ProductDescResponse(BaseModel):
    description: str


class CategorizeNoteRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class CategorizeNoteResponse(BaseModel):
    category: str  # receitas | clientes | fornecedores | ideias | lembretes


def _require_key() -> str:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY não configurado no backend.")
    return EMERGENT_LLM_KEY


def _sanitize(text: str, max_len: int) -> str:
    text = (text or "").strip().strip('"').strip("'")
    # remove aspas duplicadas nas pontas + emojis excessivos
    if text.startswith("«") and text.endswith("»"):
        text = text[1:-1].strip()
    if len(text) > max_len:
        text = text[: max_len - 1].rstrip(",.;:- ") + "…"
    return text


async def _generate(system_message: str, user_prompt: str) -> str:
    key = _require_key()
    chat = LlmChat(
        api_key=key,
        session_id=f"cl-ai-{uuid.uuid4().hex[:12]}",
        system_message=system_message,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    response = await chat.send_message(UserMessage(text=user_prompt))
    return response if isinstance(response, str) else str(response)


@router.post("/slogan", response_model=SloganResponse)
async def generate_slogan(body: SloganRequest) -> SloganResponse:
    hint = STYLE_HINT.get(body.language, STYLE_HINT["boutique"])
    specialty = body.specialty or "confeitaria e culinária caseira"
    city_line = f"Cidade: {body.city}." if body.city else ""

    system = (
        "Você é um copywriter especializado em marcas de confeitaria e culinária "
        "artesanal no Brasil. Escreve em português do Brasil, com naturalidade e "
        "sem clichês genéricos como 'do amor', 'com sabor', 'feito com carinho'."
    )
    prompt = (
        f"Crie 1 slogan CURTO (máximo 60 caracteres) para a marca '{body.brand_name}'. "
        f"Segmento: {specialty}. {city_line} "
        f"Tom: {hint} "
        "Regras: uma única linha, sem aspas, sem emoji, sem ponto final, "
        "sem repetir o nome da marca. Retorne SOMENTE o slogan."
    )
    raw = await _generate(system, prompt)
    return SloganResponse(slogan=_sanitize(raw, 60))


@router.post("/product-description", response_model=ProductDescResponse)
async def generate_product_description(body: ProductDescRequest) -> ProductDescResponse:
    hint = STYLE_HINT.get(body.language, STYLE_HINT["boutique"])
    tagline_line = f"Tagline atual do produto: {body.tagline}." if body.tagline else ""
    brand_line = f"Marca: {body.brand_name}." if body.brand_name else ""

    system = (
        "Você é um copywriter de rótulos de confeitaria artesanal. Escreve em "
        "português do Brasil de forma curta, sensorial e comercial. Nunca inventa "
        "propriedades nutricionais (sem lactose, sem glúten, orgânico) que não "
        "estejam explicitamente no pedido do usuário."
    )
    prompt = (
        f"Escreva a descrição do produto '{body.product_name}' para um rótulo/embalagem. "
        f"{brand_line} {tagline_line} "
        f"Tom: {hint} "
        "Regras: máximo 2 frases curtas, total até 200 caracteres, "
        "português do Brasil, sem emoji, sem aspas, sem inventar claims. "
        "Retorne SOMENTE o texto da descrição."
    )
    raw = await _generate(system, prompt)
    return ProductDescResponse(description=_sanitize(raw, 200))


VALID_CATEGORIES = {"receitas", "clientes", "fornecedores", "ideias", "lembretes"}


@router.post("/categorize-note", response_model=CategorizeNoteResponse)
async def categorize_note(body: CategorizeNoteRequest) -> CategorizeNoteResponse:
    system = (
        "Você classifica anotações rápidas de uma confeiteira empreendedora "
        "em UMA categoria. Responda SOMENTE com uma palavra: "
        "receitas, clientes, fornecedores, ideias ou lembretes."
    )
    prompt = (
        "Categorias possíveis:\n"
        "- receitas: ajustes, testes, versões, medidas, ingredientes.\n"
        "- clientes: preferências, pedidos, feedback, aniversários.\n"
        "- fornecedores: lojas, preços, produtos comprados, contatos.\n"
        "- ideias: novos produtos, campanhas, inspirações, planos futuros.\n"
        "- lembretes: recados urgentes, prazos, compras, tarefas.\n\n"
        f"Anotação: \"{body.text.strip()}\"\n\n"
        "Retorne apenas UMA palavra (a categoria). Sem pontuação."
    )
    raw = (await _generate(system, prompt)).strip().lower()
    # Extrai apenas letras — Claude pode adicionar pontuação/prefixos
    cleaned = "".join(ch for ch in raw if ch.isalpha())
    if cleaned not in VALID_CATEGORIES:
        # fallback simples por palavras-chave
        text_low = body.text.lower()
        if any(w in text_low for w in ["cliente", "pedido", "ela pediu", "ele pediu"]):
            cleaned = "clientes"
        elif any(w in text_low for w in ["fornecedor", "mercado", "loja", "comprar em", "atacado"]):
            cleaned = "fornecedores"
        elif any(w in text_low for w in ["receita", "açúcar", "farinha", "gramas", "colher"]):
            cleaned = "receitas"
        elif any(w in text_low for w in ["comprar", "buscar", "lembrar", "amanhã", "hoje", "prazo"]):
            cleaned = "lembretes"
        else:
            cleaned = "ideias"
    return CategorizeNoteResponse(category=cleaned)
