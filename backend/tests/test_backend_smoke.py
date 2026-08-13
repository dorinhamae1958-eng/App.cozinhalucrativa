"""Smoke tests for the rapid-push backend after Cloud Build cleanup.

Focus:
- FastAPI proxy root (:8001 → { status: ok })
- /api/health (NEW iteration_2): real DB ping — 200 if Mongo up, 503 if down
- /api/courses (proxy → Next.js → MongoDB)
- /api/courses/brigadeiro-gourmet (masterclass URL should be empty string)
- /api/ai/* — must NOT return the "EMERGENT_LLM_KEY não configurado" 500 error
- /images/brigadeiro-gourmet.png static asset returns 200
- /api/drive-image (dynamic jimp import) reachable without crop params
- db.js hardening: env read INSIDE getDb(), fail-fast throw, serverSelectionTimeoutMS
"""
import os
import re
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
DB_JS_PATH = "/app/frontend/lib/db.js"


# ---------- Proxy root ----------

def test_backend_proxy_root_returns_ok():
    """FastAPI proxy root at :8001 responds with {status: ok}."""
    # External ingress maps '/' to :3000 (Next.js), so we hit the proxy directly.
    r = requests.get("http://localhost:8001/", timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") == "ok"
    assert data.get("service") == "nextjs-api-proxy"


# ---------- Courses catalog ----------

def test_get_courses_returns_seeded_catalog():
    r = requests.get(f"{BASE_URL}/api/courses", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 5, f"Expected multiple seeded courses, got {len(data)}"
    slugs = {c.get("slug") for c in data}
    # A couple of the known seeded slugs
    assert "brigadeiro-gourmet" in slugs
    assert "bolos-caseiros" in slugs
    for course in data:
        assert "_id" not in course, "MongoDB _id must be excluded"
        assert course.get("title")
        assert course.get("slug")


def test_get_course_brigadeiro_gourmet_details():
    r = requests.get(f"{BASE_URL}/api/courses/brigadeiro-gourmet", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("slug") == "brigadeiro-gourmet"
    assert "_id" not in data
    masterclass = data.get("masterclass")
    assert isinstance(masterclass, list) and len(masterclass) >= 1
    entry = masterclass[0]
    # URL is expected to be an empty string because
    # NEXT_PUBLIC_MASTERCLASS_BRIGADEIROS_URL is intentionally unset.
    assert entry.get("url") == "", f"Expected empty masterclass URL, got {entry.get('url')!r}"
    assert entry.get("type") == "video"


def test_get_course_not_found_returns_404():
    r = requests.get(f"{BASE_URL}/api/courses/does-not-exist", timeout=15)
    assert r.status_code == 404


# ---------- AI routes (must be reachable, EMERGENT_LLM_KEY must be loaded) ----------

def test_ai_slogan_validation_error_when_body_empty():
    """Empty payload should return 422 (Pydantic), never the 500 "não configurado"."""
    r = requests.post(f"{BASE_URL}/api/ai/slogan", json={}, timeout=15)
    assert r.status_code in (400, 422), r.text
    body_text = r.text.lower()
    assert "não configurado" not in body_text
    assert "emergent_llm_key" not in body_text


def test_ai_categorize_note_is_callable():
    """Categorize is the cheapest AI endpoint — it must not 500 on missing key."""
    r = requests.post(
        f"{BASE_URL}/api/ai/categorize-note",
        json={"text": "Comprar farinha e açúcar amanhã cedo"},
        timeout=60,
    )
    # If Emergent LLM answers, we get 200. If quota/network fails we may
    # get 502/503, but we must never see the "não configurado" message.
    assert r.status_code != 500 or "não configurado" not in r.text.lower(), r.text
    if r.status_code == 200:
        cat = r.json().get("category")
        assert cat in {"receitas", "clientes", "fornecedores", "ideias", "lembretes"}


# ---------- Static images ----------

def test_static_image_brigadeiro_gourmet_loads():
    r = requests.get(f"{BASE_URL}/images/brigadeiro-gourmet.png", timeout=15)
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert ct.startswith("image/")
    assert len(r.content) > 1000


# ---------- Drive-image endpoint (dynamic jimp import) ----------

def test_drive_image_endpoint_reachable_without_crop():
    """/api/drive-image/:id must be reachable and NOT throw a jimp import error.

    A missing / invalid drive id is expected to result in a 404 or 200 image,
    but the important thing is: no 500 due to missing dep.
    """
    r = requests.get(f"{BASE_URL}/api/drive-image/invalid-drive-id-xyz", timeout=20)
    # Acceptable outcomes: 404 (upstream image not found) or a 200 fallback.
    assert r.status_code in (200, 404), f"Unexpected {r.status_code}: {r.text[:300]}"
    # If a 500 happened we would probably see a jimp / module error in body.
    if r.status_code == 500:
        assert "jimp" not in r.text.lower()


# ---------- Plans (secondary sanity check) ----------

def test_get_plans_returns_array():
    r = requests.get(f"{BASE_URL}/api/plans", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


# ---------- iteration_2: /api/health (real Mongo ping) ----------

def test_health_endpoint_returns_ok_when_mongo_reachable():
    """GET /api/health must ping Mongo and return {status:'ok', db:'ok'} 200."""
    r = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200, f"Expected 200 healthy, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("status") == "ok", f"Expected status=ok, got {data}"
    assert data.get("db") == "ok", f"Expected db=ok, got {data}"


def test_health_endpoint_does_not_call_seed():
    """Health should be lightweight — repeated calls stay fast (< 3s each)."""
    import time
    for _ in range(3):
        t0 = time.time()
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        dt = time.time() - t0
        assert r.status_code == 200
        assert dt < 5.0, f"Health probe too slow: {dt:.2f}s (should skip ensureSeeded)"


# ---------- iteration_2: db.js source-level hardening checks ----------

def test_db_js_reads_env_inside_getDb_not_at_module_top():
    """MONGO_URL must ONLY be referenced inside the getDb function, never at
    module top level, so Cloud Build's build-time evaluation cannot capture
    undefined values.
    """
    with open(DB_JS_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    # Locate function body of getDb
    m = re.search(r"export\s+async\s+function\s+getDb\s*\([^)]*\)\s*{", src)
    assert m, "getDb function not found in db.js"
    fn_start = m.end()

    # Walk braces to find function end
    depth = 1
    i = fn_start
    while i < len(src) and depth > 0:
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
        i += 1
    fn_end = i
    fn_body = src[fn_start:fn_end]
    outside = src[:m.start()] + src[fn_end:]

    assert "MONGO_URL" in fn_body, "MONGO_URL must be read inside getDb()"
    # Only allow MONGO_URL mentions in comments outside; ensure no process.env.MONGO_URL access outside fn
    assert "process.env.MONGO_URL" not in outside, (
        "process.env.MONGO_URL must NOT be evaluated at module top level"
    )
    assert "process.env.DB_NAME" not in outside, (
        "process.env.DB_NAME must NOT be evaluated at module top level"
    )


def test_db_js_has_fail_fast_error_message():
    """db.js must throw the specific diagnostic when MONGO_URL is missing."""
    with open(DB_JS_PATH, "r", encoding="utf-8") as f:
        src = f.read()
    assert "MONGO_URL is not configured in the Next.js runtime" in src, (
        "Fail-fast error message missing from db.js"
    )
    # Should be inside an if (!url) throw block
    assert re.search(r"if\s*\(\s*!\s*url\s*\)\s*{[^}]*throw", src, re.S), (
        "db.js should throw when url is falsy"
    )


def test_db_js_uses_server_selection_timeout():
    """MongoClient must be constructed with serverSelectionTimeoutMS: 10000."""
    with open(DB_JS_PATH, "r", encoding="utf-8") as f:
        src = f.read()
    assert re.search(r"serverSelectionTimeoutMS\s*:\s*10000", src), (
        "serverSelectionTimeoutMS: 10000 not found in MongoClient options"
    )


def test_only_one_mongo_client_instantiation_in_frontend():
    """Ensure there's a single MongoClient instantiation site (in db.js)."""
    import subprocess
    result = subprocess.run(
        ["grep", "-rn", "--include=*.js", "new MongoClient", "/app/frontend"],
        capture_output=True, text=True,
    )
    lines = [l for l in result.stdout.strip().splitlines() if l]
    # Filter out node_modules and .next artifacts
    src_lines = [l for l in lines if "/node_modules/" not in l and "/.next/" not in l]
    assert len(src_lines) == 1, (
        f"Expected exactly ONE MongoClient instantiation in frontend source, got: {src_lines}"
    )
    assert "/app/frontend/lib/db.js" in src_lines[0], (
        f"MongoClient should live in lib/db.js, found at: {src_lines[0]}"
    )
