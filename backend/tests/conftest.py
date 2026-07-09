"""Shared fixtures — ensures a single seeded state across the whole session
(prevents race conditions when pytest-xdist runs modules on different workers)."""
import os
import pytest
import requests
import filelock

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    from pathlib import Path
    fenv = Path("/app/frontend/.env")
    if fenv.exists():
        for line in fenv.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session", autouse=True)
def seed_once(tmp_path_factory, worker_id):
    """Seed exactly once across all xdist workers using a file lock."""
    root = tmp_path_factory.getbasetemp().parent
    lock_path = root / "seed.lock"
    done_path = root / "seed.done"
    with filelock.FileLock(str(lock_path)):
        if not done_path.exists():
            r = requests.post(f"{API}/seed", timeout=30)
            assert r.status_code == 200, f"seed failed {r.status_code} {r.text}"
            done_path.write_text("ok")
    yield
