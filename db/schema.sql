-- iCal Database Schema with full macro support
-- Run in Neon SQL Editor or any PostgreSQL client

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

CREATE INDEX IF NOT EXISTS idx_ms_user    ON meal_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fl_session ON food_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_fl_user    ON food_logs(user_id, created_at DESC);
