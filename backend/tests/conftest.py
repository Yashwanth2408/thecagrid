"""Shared fixtures — ensures a single seeded state across the whole session
(prevents race conditions when pytest-xdist runs modules on different workers).
Also handles single-worker / no-xdist mode (worker_id fixture is optional)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    from pathlib import Path
    # Try local backend/.env
    fenv_local = Path(__file__).parent.parent / ".env"
    if fenv_local.exists():
        for line in fenv_local.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
    # Try Emergent cloud path (legacy)
    if not BASE_URL:
        fenv = Path("/app/frontend/.env")
        if fenv.exists():
            for line in fenv.read_text().splitlines():
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break

BASE_URL = (BASE_URL or "http://localhost:8000").rstrip("/")
os.environ["REACT_APP_BACKEND_URL"] = BASE_URL
API = f"{BASE_URL}/api"

_SEED_DONE = False


@pytest.fixture(scope="session", autouse=True)
def seed_once(tmp_path_factory, worker_id="master"):
    """Seed exactly once per test session.

    Works with and without pytest-xdist. When xdist is active, only one worker
    performs the seed; others wait via file lock.
    """
    global _SEED_DONE

    # Fast path — already seeded in this process (non-xdist single-runner)
    if _SEED_DONE:
        yield
        return

    try:
        import filelock
        root = tmp_path_factory.getbasetemp().parent
        lock_path = root / "cagrid_seed.lock"
        done_path = root / "cagrid_seed.done"
        with filelock.FileLock(str(lock_path), timeout=60):
            if not done_path.exists():
                r = requests.post(f"{API}/seed", timeout=60)
                assert r.status_code == 200, f"seed failed {r.status_code}: {r.text}"
                done_path.write_text("ok")
        _SEED_DONE = True
    except ImportError:
        # filelock not installed — just seed once per process
        r = requests.post(f"{API}/seed", timeout=60)
        assert r.status_code == 200, f"seed failed {r.status_code}: {r.text}"
        _SEED_DONE = True

    yield
