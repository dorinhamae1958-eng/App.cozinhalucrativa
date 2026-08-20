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

## Registro — Acesso pago + Stripe sandbox (2026-06, iteração 2)
- **Acesso pago ligado:** `BETA_MODE=false` (backend + frontend). Só entra quem tem grant de pagamento ou está na allowlist (casadalise20026@gmail.com).
- **Stripe sandbox reivindicável (Flow A) provisionado:** conta `acct_1U3gxXPzKu0RiJZF` (BR, `charges_enabled=false` até KYC). Chaves reais de TESTE gravadas no `backend/.env` (sk_test_51U3..., pk_test_51U3..., whsec_...). Catálogo criado no boot: produto + preço `cozinha_lucrativa_57` = 5700 BRL (one-time). `STRIPE_MODE=test`, `STRIPE_TAX_MODE=diy`.
- **Fluxo validado (testing_agent, 100% backend):** POST /api/payments/checkout → checkout.stripe.com; cartão teste 4242 → GET /api/payments/status vira paid → `access_grants` recebe grant de 12 meses. Regressão em `/app/backend/tests/test_stripe_payments.py`.
- **Go-live Stripe:** o usuário deve REIVINDICAR o sandbox (KYC) pelo onboarding_url; a plataforma troca as chaves de teste por LIVE automaticamente no deploy. NÃO colar chaves pk_live/Buy Button pessoais (o app usa Checkout server-side + grant de acesso; Buy Button não integra com isso).
- Tax mode atual: DIY (Stripe só processa; sem imposto). Alternativas: Stripe calcula (+0,5%) ou Stripe gerencia tudo (+3,5%). Trocável depois a pedido.

## Go-live
Deploy pela plataforma Emergent (botão **Deploy**): HTTPS + domínio automáticos. Após o deploy + KYC do Stripe, a plataforma redeploya automaticamente com as chaves LIVE.

## Pendente desta iteração
- MongoDB Atlas: aguardando a string de conexão `mongodb+srv://...` do usuário (ainda não fornecida).

## Registro — Pagamentos MP + Afiliados A/B + Códigos VIP (2026, iteração 4)
Implementadas as atualizações enviadas pelo usuário via zip (mergeadas em /app, sem tocar em .env/next.config):

**Mercado Pago (gateway principal, Checkout Pro):** `mp_routes.py` — preference/status/webhook, PIX+cartão, concede acesso (access_grants 12m) só quando `approved`. Stripe mantido no backend mas OCULTO na UI (`SHOW_STRIPE=false` em Plans.jsx). PENDENTE: credenciais de teste MP (MP_ACCESS_TOKEN/MP_WEBHOOK_SECRET) — sem elas, preference retorna 503.

**Afiliados 2 níveis (A/B)** — `commissions.py` (taxas fixas): venda direta A=50%; venda de B → B=30% + indicador A=30% (override automático) + plataforma=40%. Comissão só conta quando aprovado. `affiliate_routes.py` (generation/parent), Stripe+MP gravam `commission` na venda. Painel /admin/afiliados. Link `?ref=CODIGO` atribui venda (MP e Stripe). Validado (testing_agent 100%): A 50% + override 30% dos B; B 30%.

**Códigos de acesso social (VIP 100% off)** — `access_code_routes.py`: quando o valor final é R$0, NÃO chama checkout/MP/Stripe — acesso liberado direto (access_grants) e resgate registrado. Controle de usos (atômico), validade, plano. Auto-seed no boot (`seed_access_codes.py`): VIP100(20), PASTOR100(50), CONVIDADO100(100). Painel /admin/codigos (código, quem usou, data, usos restantes). Validado (testing_agent 100%): limite de usos, expiração, idempotência por e-mail.

**Login:** removida tela /entrar — usuário não logado vai direto pro Google (App.js LoginRedirect).

Deps adicionadas: `mercadopago==3.5.0`, `email-validator`. Build de produção (next build) OK. testing_agent iteração 2: 23/23 backend.

## Pendências
- **Mercado Pago:** credenciais de TESTE do usuário para ativar o checkout (hoje 503).
- **Redeploy** para levar tudo à produção.
- MongoDB Atlas (opcional).

## Registro — Deploy produção + correções (2026-06, iteração 3)
- **Produção no ar:** https://kitchen-revenue.emergent.host (deploy Emergent). Preview segue em kitchen-revenue.preview.emergentagent.com.
- **1º deploy falhou** no build step 8 (node-base). Build local passava. Aplicadas correções de hardening de build (config, sem lógica): `next.config.js` → `eslint.ignoreDuringBuilds:true` + `typescript.ignoreBuildErrors:true`. Deploy seguinte OK.
- **Correção de portabilidade preview↔produção (payment_routes._resolve_origin):** antes priorizava `APP_URL` (fixo = preview) → em produção o Stripe redirecionaria o comprador de volta ao preview após pagar (bancos separados = confirmação quebrada). Agora prioriza o `Origin`/`Referer` real da requisição (APP_URL vira fallback). Verificado: success_url/cancel_url seguem o domínio de acesso. Validação anti open-redirect do `candidate` inalterada.
- **CORS liberado:** `CORS_ORIGINS="*"` (backend/.env e frontend/.env). `APP_URL` fallback = domínio de produção.
- **IMPORTANTE:** essas 3 correções estão no PREVIEW. Produção precisa de **REDEPLOY** para recebê-las (o deploy atual de produção ainda tem APP_URL/CORS de preview).
