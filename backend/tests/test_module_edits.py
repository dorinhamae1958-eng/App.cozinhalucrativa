"""Tests for iteration 3 module edits:
- receitas-kids: no 'Vídeo de Vendas' nor 'Criativos' modules
- geladinhos-gourmet: no 'Material do Curso', no 'Plr', but 'Imagens de Apoio' with 3 lessons
- Regressions: no '🎁'/Bônus module titles from previous iterations
- Other courses intact + public endpoints healthy
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _get_course(api, slug):
    r = api.get(f"{BASE_URL}/api/courses/{slug}", timeout=30)
    assert r.status_code == 200, f"{slug} returned {r.status_code}: {r.text[:300]}"
    return r.json()


def _module_titles(course):
    mods = course.get("modules") or course.get("Modules") or []
    return [m.get("title") or m.get("name") for m in mods]


def _find_module(course, title):
    mods = course.get("modules") or course.get("Modules") or []
    for m in mods:
        if (m.get("title") or m.get("name")) == title:
            return m
    return None


# ---------- Public endpoints ----------
def test_health(api):
    r = api.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200, r.text


def test_plans(api):
    r = api.get(f"{BASE_URL}/api/plans", timeout=15)
    assert r.status_code == 200


def test_courses_list(api):
    r = api.get(f"{BASE_URL}/api/courses", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))


# ---------- receitas-kids ----------
def test_receitas_kids_removed_modules(api):
    course = _get_course(api, "receitas-kids")
    titles = _module_titles(course)
    print("receitas-kids modules:", titles)
    assert "Vídeo de Vendas" not in titles, f"'Vídeo de Vendas' still present: {titles}"
    assert "Criativos" not in titles, f"'Criativos' still present: {titles}"


def test_receitas_kids_expected_modules_still_present(api):
    course = _get_course(api, "receitas-kids")
    titles = _module_titles(course)
    expected = [
        "PDF's das Receitas",
        "Página de Vendas",
        "02 Brigadeiro",
        "03 Bolinho de Cacau",
        "01 Boas Vindas",
        "04 Cookies",
    ]
    missing = [t for t in expected if t not in titles]
    assert not missing, f"Missing expected modules: {missing}. Actual: {titles}"


# ---------- geladinhos-gourmet ----------
def test_geladinhos_material_do_curso_removed(api):
    course = _get_course(api, "geladinhos-gourmet")
    titles = _module_titles(course)
    print("geladinhos-gourmet modules:", titles)
    assert "Material do Curso" not in titles, f"'Material do Curso' still present: {titles}"


def test_geladinhos_plr_renamed(api):
    course = _get_course(api, "geladinhos-gourmet")
    titles = _module_titles(course)
    assert "Plr" not in titles, f"'Plr' module still present (should be renamed): {titles}"
    assert "Imagens de Apoio" in titles, f"'Imagens de Apoio' missing: {titles}"


def test_geladinhos_imagens_de_apoio_lessons(api):
    course = _get_course(api, "geladinhos-gourmet")
    mod = _find_module(course, "Imagens de Apoio")
    assert mod is not None
    lessons = mod.get("lessons") or mod.get("Lessons") or []
    lesson_titles = [l.get("title") or l.get("name") for l in lessons]
    print("Imagens de Apoio lessons:", lesson_titles)
    assert len(lessons) == 3, f"Expected 3 lessons, got {len(lessons)}: {lesson_titles}"
    joined = " | ".join(lesson_titles).lower()
    for expected_kw in ["bônus 1", "bônus 2", "geladinho"]:
        assert expected_kw.lower() in joined, f"Expected keyword '{expected_kw}' in lessons: {lesson_titles}"


# ---------- Regressions from previous iterations ----------
@pytest.mark.parametrize("slug", [
    "receitas-kids", "geladinhos-gourmet", "bolos-caseiros",
    "brigadeiro-gourmet", "delicias-lucrativas",
])
def test_no_gift_or_bonus_general_modules(api, slug):
    course = _get_course(api, slug)
    titles = _module_titles(course)
    for t in titles:
        if not t:
            continue
        assert "🎁" not in t, f"[{slug}] Module title contains 🎁: {t}"
        # Reject standalone 'Bônus', 'Bônus Extra', 'Bônus Geral' (but not e.g. 'Bônus Como...')
        norm = t.strip()
        assert not re.fullmatch(r"(?i)bônus", norm), f"[{slug}] bare 'Bônus' module: {t}"
        assert not re.fullmatch(r"(?i)bônus\s+extra", norm), f"[{slug}] 'Bônus Extra' module: {t}"
        assert not re.fullmatch(r"(?i)bônus\s+geral", norm), f"[{slug}] 'Bônus Geral' module: {t}"


# ---------- Spot check: other courses still have modules ----------
@pytest.mark.parametrize("slug", ["bolos-caseiros", "brigadeiro-gourmet", "delicias-lucrativas"])
def test_other_courses_intact(api, slug):
    course = _get_course(api, slug)
    titles = _module_titles(course)
    assert len(titles) > 0, f"[{slug}] has no modules: {course}"
    print(f"{slug}: {titles}")
