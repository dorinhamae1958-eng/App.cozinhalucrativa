# Tests for course catalog (Marmitas Fitness standardization)
import os

import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")).rstrip("/")


class TestCourses:
    def test_courses_list_and_marmita(self):
        r = requests.get(f"{BASE_URL}/api/courses", timeout=60)
        assert r.status_code == 200, r.text[:300]
        payload = r.json()
        courses = payload if isinstance(payload, list) else payload.get("courses", payload.get("items"))
        assert isinstance(courses, list), type(payload)
        assert len(courses) == 16, f"expected 16 courses got {len(courses)}"
        slugs = [c.get("slug") for c in courses]
        assert "marmita-fitness" in slugs, slugs
        c = next(x for x in courses if x.get("slug") == "marmita-fitness")
        mods = c.get("modules") or []
        assert len(mods) == 6, f"modules={len(mods)}"
        lessons = sum(len(m.get("lessons") or []) for m in mods)
        assert lessons == 28, f"lessons={lessons}"
        assert c.get("apostilas"), "apostilas missing"
        assert "definir" not in str(c).lower(), "placeholder 'A definir' found"
