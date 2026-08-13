# Cozinha Lucrativa — PRD

## Problema (original)
Deploy do CozinhaLucrativa: subir para produção sem alterar regras de negócio/features. Apenas config, build e infraestrutura (env vars, URLs, CORS, build prod).

## Arquitetura
- **Frontend:** Next.js 15 (porta 3000). SPA React (react-router) carregada via `app/[[...slug]]/page.js` (dynamic import de `src/App.js`, `ssr:false`). API routes Next em `app/api/[[...path]]/route.js` acessam MongoDB direto (`lib/db.js`).
- **Backend:** FastAPI (porta 8001) = proxy de `/api/*` para o Next (localhost:3000), EXCETO rotas Python nativas: `/api/ai/*` (Claude via Emergent LLM), `/api/plantao/*`, `/api/payments/*` e `/api/stripe/*` (Stripe).
- **Ingress:** `/api` → 8001 → proxy → Next 3000. Frontend chama a API same-origin via `REACT_APP_BACKEND_URL`.
- **DB:** MongoDB local, `DB_NAME=cozinha_lucrativa` (frontend Next e backend leem o mesmo banco).
- **Auth:** Emergent Managed Google OAuth (`auth.emergentagent.com`). Gating por `access_grants` (Stripe) OU allowlist `ADMIN_EMAILS`/`TEACHER_EMAIL` OU `BETA_MODE=true`.
- **Pagamentos:** Stripe Checkout (R$57 pagamento único, acesso 12 meses).

## Variáveis de ambiente necessárias
### backend/.env
MONGO_URL, DB_NAME=cozinha_lucrativa, CORS_ORIGINS, APP_URL, EMERGENT_LLM_KEY, ADMIN_EMAILS, TEACHER_EMAIL, BETA_MODE, STRIPE_MODE, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_TAX_MODE, STRIPE_WEBHOOK_SECRET
### frontend/.env
REACT_APP_BACKEND_URL, MONGO_URL, DB_NAME, BETA_MODE, ADMIN_EMAILS, TEACHER_EMAIL, CORS_ORIGINS, WDS_SOCKET_PORT, NEXT_PUBLIC_BUILD_ID

## Registro de Deploy / Bring-up (2026-06)
Projeto importado de `cozinhalucrativa-main.zip` para `/app`. Somente CONFIG alterada (sem tocar em lógica/negócio).

**Fase 1 — Diagnóstico:** mapeada a estrutura; sem segredos no repo; localhost usado apenas internamente (proxy FastAPI→Next em localhost:3000, correto p/ arquitetura Emergent) e em fallbacks de MONGO_URL com override por env.

**Fase 2/3 — Config + build:** `.env` de backend e frontend preenchidos. Deps instaladas (pip + yarn). Serviços via supervisor (uvicorn server:app / `yarn start`=next dev). Rodando end-to-end.

**Correções aplicadas (SÓ config, sem mudar lógica):**
1. `frontend/.env`: adicionado `NEXT_PUBLIC_BUILD_ID=cozinha-prod-1`. Antes, `version.json` caía no fallback `Date.now()`, gerando versões diferentes a cada request no dev do Next → cliente detectava "nova versão" e recarregava em loop ("Atualizando para versão mais recente…"). Build id fixo estabiliza `/version.json`.
2. `frontend/next.config.js` → `allowedDevOrigins`: substituídos os hosts antigos (`extra-cash-3...`) e removido o entry inválido `'*'` (que invalidava a lista), deixando os hosts exatos deste ambiente (`kitchen-revenue.preview.emergentagent.com` e `kitchen-revenue.cluster-5.preview.emergentcf.cloud`). Antes o Next bloqueava os chunks `/_next/*` por cross-origin → tela em branco.

**Validação:**
- Landing renderiza 100% em navegador real (Playmwright/Chromium): "Cozinha Lucrativa / R$57 / PAGAMENTO ÚNICO…" (BODY_LEN ~9k).
- APIs OK: `/api/courses` 200, `/api/auth/me` 401 (sem login, correto), `/api/payments/config` 200 (mode=test), `/` 200, `/version.json` estável.
- deployment_agent: **PASS** (sem bloqueadores).

## Pendências / decisões abertas (do usuário)
- **Stripe LIVE:** hoje `STRIPE_MODE=test` com chave placeholder `sk_test_emergent` → checkout real DESLIGADO. Para cobranças reais é preciso `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` de produção + conta ativa BR.
- **Acesso:** `BETA_MODE=true` (acesso liberado sem pagamento). Trocar para `false` quando quiser gating pago.
- **Domínio:** usando subdomínio da plataforma. Domínio próprio pode ser configurado no deploy.
- **MongoDB:** local (preview). Para produção gerenciada, trocar `MONGO_URL` por URI do Atlas.

## Go-live
Deploy pela plataforma Emergent (botão **Deploy**): HTTPS + domínio automáticos.
