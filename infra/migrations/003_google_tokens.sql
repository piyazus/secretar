-- 003_google_tokens.sql
-- Хранение OAuth-токенов Google владельца (ТЗ §5: токены только локально).
-- Заполняется при первом входе через NextAuth (веб-чат), далее обновляется
-- автоматически при refresh access_token.

CREATE TABLE IF NOT EXISTS google_tokens (
    email         TEXT PRIMARY KEY,
    access_token  TEXT,
    refresh_token TEXT,
    expiry_date   BIGINT,        -- ms since epoch
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE google_tokens IS 'OAuth-токены Google владельца — только локально (ТЗ §5)';
