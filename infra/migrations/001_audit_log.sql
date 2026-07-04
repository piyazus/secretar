-- 001_audit_log.sql
-- Обязательное требование ТЗ раздел 5: лог всех действий агента с календарём/почтой
-- (кто/что/когда) для финансового контекста.

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor       TEXT NOT NULL,          -- кто инициировал: 'director' | 'agent' | employee email
    action      TEXT NOT NULL,          -- напр. 'calendar.create', 'mail.send', 'calendar.add_guest'
    target      TEXT,                  -- id встречи / письма / получатель
    details     JSONB,                 -- произвольные детали действия (тема, время, участники и т.п.)
    success     BOOLEAN NOT NULL DEFAULT true,
    error       TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log (actor);

COMMENT ON TABLE audit_log IS 'Аудит-лог всех действий Secretar с календарём/почтой — обязательное требование ТЗ §5';
