"""Backend tests validating the '🎁 Bônus' module removal fix (iteration 2).

Now we assert that ANY module whose title contains '🎁' OR any variant of
'bônus'/'bonus' is removed from every course endpoint.

Legitimate modules (Módulo XX, Apostila, Material, 🎬 Masterclass, Material de
Apoio) must remain intact.

Backend is a FastAPI proxy for Next.js. Public endpoints, no auth needed.
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitchen-preview-7.preview.emergentagent.com").rstrip("/")

BONUS_REGEX = re.compile(r"b[oô]nus", re.IGNORECASE)
GIFT_EMOJI = "🎁"

# Legitimate module titles/prefixes that MUST still appear at least once across corpus
EXPECTED_LEGIT_HINTS = [
    re.compile(r"m[oó]dulo\s*0?\d+", re.IGNORECASE),
    re.compile(r"apostila", re.IGNORECASE),
    re.compile(r"material", re.IGNORECASE),
    re.compile(r"masterclass", re.IGNORECASE),
]

ALL_COURSE_SLUGS = [
    "delicias-lucrativas",
    "confeitaria-fitness",
    "confeitaria-alta-demanda",
    "geladinhos-gourmet",
    "bolos-caseiros",
    "receitas-low-carb",
    "brigadeiro-gourmet",
    "iogurtes-gourmet",
    "hamburgao-lucrativo",
    "rocambole-lucrativo",
    "receitas-lactose",
    "receitas-zero-gluten",
    "receitas-kids",
    "receitas-diabeticos",
    "plr-pascoa",
]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


def _get(client, path):
    url = f"{BASE_URL}{path}"
    r = client.get(url, timeout=30)
    return r, url


def _module_title(m):
    return (m.get("title") or m.get("name") or "").strip()


def _is_bonus_module(title: str) -> bool:
    if not title:
        return False
    if GIFT_EMOJI in title:
        return True
    if BONUS_REGEX.search(title):
        return True
    return False


def _collect_bonus_hits(modules, path=""):
    hits = []
    for m in modules or []:
        t = _module_title(m)
        if _is_bonus_module(t):
            hits.append(f"{path}/{t}")
        for key in ("modules", "subModules", "sub_courses", "subCourses", "children"):
            if isinstance(m.get(key), list):
                hits.extend(_collect_bonus_hits(m[key], path + "/" + t))
    return hits


# -------- Health / core endpoints --------
class TestPublicEndpoints:
    def test_health(self, client):
        r, url = _get(client, "/api/health")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"

    def test_plans(self, client):
        r, url = _get(client, "/api/plans")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"

    def test_courses_list(self, client):
        r, url = _get(client, "/api/courses")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"
        data = r.json()
        courses = data if isinstance(data, list) else (data.get("courses") or data.get("data") or [])
        assert len(courses) > 0


# -------- Bonus removal per course --------
class TestGiftBonusRemoval:
    @pytest.mark.parametrize("slug", ALL_COURSE_SLUGS)
    def test_course_has_no_bonus_module(self, client, slug):
        r, url = _get(client, f"/api/courses/{slug}")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:300]}"
        course = r.json()
        modules = course.get("modules") or []
        hits = _collect_bonus_hits(modules)
        # Also walk sub_courses at top level (combo)
        for key in ("sub_courses", "subCourses", "courses"):
            if isinstance(course.get(key), list):
                for sc in course[key]:
                    hits.extend(_collect_bonus_hits(sc.get("modules") or [],
                                                   path=sc.get("slug") or sc.get("title") or ""))
        assert not hits, f"Course '{slug}' still exposes bonus module(s): {hits}"

    def test_combo_delicias_lucrativas_deep(self, client):
        r, url = _get(client, "/api/courses/delicias-lucrativas")
        assert r.status_code == 200, f"{url} -> {r.status_code}"
        course = r.json()
        modules = course.get("modules") or []
        hits = _collect_bonus_hits(modules, path="delicias-lucrativas")
        for key in ("sub_courses", "subCourses", "courses"):
            if isinstance(course.get(key), list):
                for sc in course[key]:
                    hits.extend(_collect_bonus_hits(sc.get("modules") or [],
                                                   path=f"delicias-lucrativas/{sc.get('slug') or ''}"))
        assert not hits, f"Combo still has bonus modules: {hits}"


# -------- Legitimate modules retained --------
class TestLegitimateModulesRetained:
    def test_at_least_one_legit_module_across_courses(self, client):
        """Across all listed courses, we must still find at least one Módulo/Apostila/Material/Masterclass."""
        found_hints = set()
        for slug in ALL_COURSE_SLUGS:
            r, _ = _get(client, f"/api/courses/{slug}")
            if r.status_code != 200:
                continue
            course = r.json()
            mods = course.get("modules") or []
            for m in mods:
                t = _module_title(m)
                for i, pat in enumerate(EXPECTED_LEGIT_HINTS):
                    if pat.search(t):
                        found_hints.add(i)
        assert len(found_hints) >= 2, (
            f"Expected legitimate module types (Módulo/Apostila/Material/Masterclass) largely missing. "
            f"Found hint indexes: {found_hints}"
        )

    @pytest.mark.parametrize("slug", ["bolos-caseiros", "brigadeiro-gourmet", "confeitaria-fitness"])
    def test_course_has_non_bonus_modules(self, client, slug):
        r, _ = _get(client, f"/api/courses/{slug}")
        assert r.status_code == 200
        course = r.json()
        mods = course.get("modules") or []
        non_bonus = [_module_title(m) for m in mods if not _is_bonus_module(_module_title(m))]
        assert non_bonus, f"Course {slug} has NO non-bonus modules remaining (over-filtered?)"
