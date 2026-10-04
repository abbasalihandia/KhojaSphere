from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from sqlalchemy import create_engine, inspect

from app.database.session import Base
import app.models  # noqa: F401

ROOT = Path(__file__).resolve().parents[1]


def test_migrations_match_models_and_downgrade_cleanly():
    db = Path(tempfile.mkdtemp()) / "m.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db}"}
    run = lambda *a: subprocess.run([sys.executable, "-m", "alembic", *a], cwd=ROOT, env=env, capture_output=True, text=True)
    up = run("upgrade", "head")
    assert up.returncode == 0, up.stderr
    insp = inspect(create_engine(f"sqlite:///{db}"))
    tables = set(insp.get_table_names()) - {"alembic_version"}
    assert tables == set(Base.metadata.tables)
    for name, table in Base.metadata.tables.items():  # every model column exists in the migrated schema
        assert {c["name"] for c in insp.get_columns(name)} == {c.name for c in table.columns}, name
    check = run("check")  # alembic reports pending model changes that have no migration
    assert check.returncode == 0, check.stdout + check.stderr
    assert run("downgrade", "base").returncode == 0
    assert set(inspect(create_engine(f"sqlite:///{db}")).get_table_names()) == {"alembic_version"}


def test_seed_is_idempotent(client, seeded):
    from app.database.session import SessionLocal
    from app.models import Business
    from seed import seed as seed_mod
    with SessionLocal() as db:
        n = db.query(Business).count()
        res = seed_mod.run(db, admin_email="admin@khojasphere.example", admin_password="x", demo_password="y")
        assert res["seeded"] is False and db.query(Business).count() == n
        seed_mod.run(db, admin_email="admin@khojasphere.example", admin_password="x", demo_password="y", reset=True)
        assert db.query(Business).count() == n
