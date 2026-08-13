"""Backend tests validating the 'Bônus Extra / Bônus Geral' module removal fix.

Focus: Public endpoints only (no auth). Backend is a proxy for Next.js.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitchen-preview-7.preview.emergentagent.com").rstrip("/")

BONUS_TARGET_TITLES = {"bônus extra", "bonus extra", "bônus geral", "bonus geral"}
BONUS_EXTRA_LESSON_NAMES = [
    "Como criar seu logotipo",
    "A Felicidade Começa com Você",
    "O Poder da Gratidão",
    "Como Aumentar Sua Produtividade",
    "Você Nasceu para Vencer",
]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


def _get_json(client, path):
    url = f"{BASE_URL}{path}"
    r = client.get(url, timeout=30)
    return r, url


# --- Health & list endpoints ---
class TestPublicHealth:
    def test_health(self, client):
        r, url = _get_json(client, "/api/health")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"

    def test_plans(self, client):
        r, url = _get_json(client, "/api/plans")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_courses_list(self, client):
        r, url = _get_json(client, "/api/courses")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"
        data = r.json()
        # accept either list directly or dict wrapping
        courses = data if isinstance(data, list) else data.get("courses") or data.get("data") or []
        assert len(courses) > 0, "Expected at least one course in listing"


# --- Bônus Extra removal validation ---
def _module_title(m):
    return (m.get("title") or m.get("name") or "").strip().lower()


def _find_bonus_extra_modules(modules):
    hits = []
    for m in modules or []:
        t = _module_title(m)
        # Exact match of "bônus extra" / "bônus geral" (case insensitive)
        # Do NOT flag "🎁 Bônus" (course-specific bonus)
        if t in BONUS_TARGET_TITLES:
            hits.append(m.get("title") or m.get("name"))
    return hits


class TestBonusExtraRemoval:
    @pytest.mark.parametrize("slug", [
        "geladinhos-gourmet",
        "bolos-caseiros",
        "brigadeiro-gourmet",
        "hamburgao-lucrativo",
        "rocambole-lucrativo",
        "iogurtes-gourmet",
        "confeitaria-fitness",
        "confeitaria-alta-demanda",
        "receitas-low-carb",
        "receitas-lactose",
        "receitas-zero-gluten",
        "receitas-kids",
        "receitas-diabeticos",
        "plr-pascoa",
    ])
    def test_course_has_no_bonus_extra_module(self, client, slug):
        r, url = _get_json(client, f"/api/courses/{slug}")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:300]}"
        course = r.json()
        modules = course.get("modules") or []
        hits = _find_bonus_extra_modules(modules)
        assert not hits, f"Course {slug} still contains Bônus Extra/Geral module(s): {hits}"

    def test_combo_course_no_bonus_extra_in_submodules(self, client):
        r, url = _get_json(client, "/api/courses/delicias-lucrativas")
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:300]}"
        course = r.json()
        modules = course.get("modules") or []
        # Combo may have sub-courses; recurse
        offenders = []

        def walk(mods, path=""):
            for m in mods or []:
                t = _module_title(m)
                if t in BONUS_TARGET_TITLES:
                    offenders.append(f"{path}/{m.get('title') or m.get('name')}")
                # nested modules or subCourses
                for key in ("modules", "subModules", "sub_courses", "subCourses", "children"):
                    if isinstance(m.get(key), list):
                        walk(m[key], path + "/" + (m.get("title") or m.get("name") or ""))

        walk(modules)
        # Also walk top-level sub_courses if present
        for key in ("sub_courses", "subCourses", "courses"):
            if isinstance(course.get(key), list):
                for sc in course[key]:
                    walk(sc.get("modules") or [], sc.get("title") or sc.get("slug") or "")
        assert not offenders, f"delicias-lucrativas combo still has Bônus Extra/Geral: {offenders}"

    def test_no_course_leaks_bonus_extra_lessons(self, client):
        """Warn (do not fail) if bonus-extra lesson titles appear inside a legit '🎁 Bônus' module.
        Iterate all known courses and check lesson names."""
        slugs = [
            "geladinhos-gourmet", "bolos-caseiros", "brigadeiro-gourmet",
            "hamburgao-lucrativo", "rocambole-lucrativo", "iogurtes-gourmet",
            "confeitaria-fitness", "confeitaria-alta-demanda",
            "delicias-lucrativas",
        ]
        warnings = []
        failures = []
        for slug in slugs:
            r, url = _get_json(client, f"/api/courses/{slug}")
            if r.status_code != 200:
                warnings.append(f"[SKIP] {slug} -> {r.status_code}")
                continue
            course = r.json()
            modules = course.get("modules") or []
            for m in modules:
                title = m.get("title") or m.get("name") or ""
                lessons = m.get("lessons") or m.get("videos") or []
                for lesson in lessons:
                    lname = (lesson.get("title") or lesson.get("name") or "")
                    for target in BONUS_EXTRA_LESSON_NAMES:
                        if target.lower() in lname.lower():
                            if "🎁" in title or "bônus" in title.lower():
                                warnings.append(f"[WARN] {slug}: '{lname}' in bonus module '{title}'")
                            else:
                                failures.append(f"{slug}: Lesson '{lname}' in non-bonus module '{title}'")
        if warnings:
            print("\n".join(warnings))
        assert not failures, f"Bonus-Extra lessons leaked into non-bonus modules: {failures}"
