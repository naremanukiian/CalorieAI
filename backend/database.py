"""
database.py — PostgreSQL connection pool with SSL support (Neon.tech compatible)
"""

import os
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/ical")


def _parse(url: str) -> dict:
    url = url.replace("postgresql://", "").replace("postgres://", "")
    sslmode = None
    if "?" in url:
        url, qs = url.split("?", 1)
        for part in qs.split("&"):
            if part.startswith("sslmode="):
                sslmode = part.split("=", 1)[1]
    user_pass, rest   = url.split("@", 1)
    host_port, dbname = rest.rsplit("/", 1)
    user, password = user_pass.split(":", 1) if ":" in user_pass else (user_pass, "")
    host, port     = host_port.rsplit(":", 1) if ":" in host_port else (host_port, "5432")
    kw = {"dbname": dbname, "user": user, "password": password, "host": host, "port": int(port)}
    if sslmode:
        kw["sslmode"] = sslmode
    if "neon.tech" in host and not sslmode:
        kw["sslmode"] = "require"
    return kw


_KW   = _parse(DATABASE_URL)
_pool = None


def _get_pool():
    global _pool
    if _pool is None or _pool.closed:
        _pool = pool.ThreadedConnectionPool(1, 10, **_KW)
    return _pool


@contextmanager
def get_db():
    conn = _get_pool().getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _get_pool().putconn(conn)


def init_db():
    ddl = """
    CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        weight        NUMERIC(5,2),
        goal          VARCHAR(20) CHECK (goal IN ('lose','maintain','gain')),
        calorie_goal  INTEGER DEFAULT 2000,
        created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meal_sessions (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        meal_type      VARCHAR(20) DEFAULT 'other',
        total_calories INTEGER NOT NULL DEFAULT 0,
        total_carbs    NUMERIC(8,2) NOT NULL DEFAULT 0,
        total_fat      NUMERIC(8,2) NOT NULL DEFAULT 0,
        total_protein  NUMERIC(8,2) NOT NULL DEFAULT 0,
        food_summary   TEXT,
        created_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS food_logs (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id  INTEGER REFERENCES meal_sessions(id) ON DELETE CASCADE,
        food_name   VARCHAR(255) NOT NULL,
        calories    INTEGER NOT NULL DEFAULT 0,
        carbs       NUMERIC(8,2) NOT NULL DEFAULT 0,
        fat         NUMERIC(8,2) NOT NULL DEFAULT 0,
        protein     NUMERIC(8,2) NOT NULL DEFAULT 0,
        serving     VARCHAR(100),
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ms_user ON meal_sessions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fl_session ON food_logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_fl_user ON food_logs(user_id, created_at DESC);
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
    print("✅  Database tables ready.")
