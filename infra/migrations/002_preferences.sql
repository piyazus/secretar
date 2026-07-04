-- 002_preferences.sql
-- Накопленная память предпочтений директора (ТЗ §9, Фаза 4 — основной ров продукта).
-- Создаётся заранее в MVP, чтобы данные копились с первого дня использования.

CREATE TABLE IF NOT EXISTS director_preferences (
    id          BIGSERIAL PRIMARY KEY,
    key         TEXT NOT NULL UNIQUE,   -- напр. 'important_contact:ivan@fund.kz', 'email_style'
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
