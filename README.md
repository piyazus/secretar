# Secretar

Кастомный self-hosted ИИ-секретарь директора финансового фонда. Полное ТЗ — см. `ТЗ_Secretar.md` в проектной папке (не в этом репозитории, т.к. содержит внутренний контекст фонда).

## Архитектура

```
[Чат-интерфейс (Next.js, /frontend)]
        ↓
[n8n — оркестрация, self-hosted, /n8n + /infra]
        ↓
[LLM: Claude Sonnet 5 (сложные задачи) / Haiku 4.5 (роутинг)] — /lib/llm
        ↓
[Google Calendar API] [Gmail API]  — /lib/calendar, /lib/gmail
[faster-whisper self-hosted (голос)] — /lib/voice
        ↓
[PostgreSQL self-hosted — память, аудит-лог, предпочтения] — /infra/migrations
```

Всё, кроме вызовов Anthropic API, работает на одном VPS (self-hosted) — это
осознанный выбор по ТЗ §5 (конфиденциальность финансовых данных фонда) и §9
(ров продукта: self-hosted инфраструктура + накопленная память директора не
переносятся и не воспроизводятся конкурентом за недели).

## Структура репозитория

| Путь | Назначение |
|---|---|
| `/frontend` | Next.js (TS, App Router, Tailwind) — чат-интерфейс директора |
| `/n8n` | Экспортированные workflow n8n (JSON), монтируются в контейнер |
| `/infra` | `docker-compose.yml`, `Caddyfile`, SQL-миграции — вся инфраструктура одним стеком |
| `/lib/llm` | Абстракция вызова Claude (Sonnet/Haiku), переключение через env |
| `/lib/calendar` | Google Calendar — CRUD встреч, добавление гостей (ТЗ §4.1) |
| `/lib/gmail` | Gmail — чтение/отправка писем, авто-приглашения (ТЗ §4.2) |
| `/lib/voice` | Клиент self-hosted faster-whisper (ТЗ §4.4) |

Функции в `/lib/calendar` и `/lib/gmail` — заглушки (`throw new Error(...)`) с
точными сигнатурами из ТЗ; реализация — через `googleapis` после настройки
OAuth 2.0 Client ID.

## Деплой на VPS (Hetzner CPX21 или аналог)

1. **Сервер**: Ubuntu 22.04+, минимум 2 vCPU / 8GB RAM (faster-whisper на CPU
   ощутимо ест память на модели `medium`+).
2. Установить Docker + Docker Compose plugin:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Скопировать репозиторий на сервер (`git clone` или `scp`), затем создать
   `.env` в корне на основе `.env.example` — **заполнить все переменные без
   значений** (см. таблицу ниже).
4. DNS: A-запись `<DOMAIN>` и `n8n.<DOMAIN>` → IP сервера (нужно ДО запуска
   Caddy, иначе не выпустится SSL-сертификат).
5. Запуск:
   ```bash
   cd infra
   docker compose up -d
   docker compose logs -f
   ```
6. Миграции (`001_audit_log.sql`, `002_preferences.sql`) применяются
   автоматически при первом старте postgres (директория `initdb.d`). Для
   повторного применения на уже существующей БД — накатить вручную через
   `docker compose exec postgres psql -U secretar -d secretar -f /docker-entrypoint-initdb.d/00X_*.sql`.
7. Google OAuth: в Google Cloud Console обновить redirect URI на
   `https://<DOMAIN>/api/auth/callback/google` (замена плейсхолдера TBD).
8. Импортировать n8n workflows (см. `/n8n/README.md`).

## Переменные окружения — чек-лист перед первым `docker compose up`

См. `.env.example` — обязательно заполнить:

- `ANTHROPIC_API_KEY` — из console.anthropic.com (без привязки карты можно
  получить ключ, но вызовы будут падать без активного billing)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — из Google Cloud Console (OAuth
  2.0 Client ID, тип Web application)
- `GOOGLE_REDIRECT_URI` — заменить `TBD` на реальный домен
- `POSTGRES_PASSWORD` — сгенерировать (`openssl rand -hex 24`)
- `N8N_ENCRYPTION_KEY` — сгенерировать (`openssl rand -hex 24`), нельзя менять после первого запуска
- `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD` — логин в n8n UI
- `DOMAIN`, `N8N_HOST` — реальные домены после покупки/настройки DNS
- `ACME_EMAIL` — email для Let's Encrypt (уведомления об истечении сертификата)
- `NEXTAUTH_SECRET` — сгенерировать (`openssl rand -hex 32`)
- `NEXTAUTH_URL` — `https://<DOMAIN>`

## Аудит (ТЗ §5)

Таблица `audit_log` (`infra/migrations/001_audit_log.sql`) фиксирует
timestamp/actor/action/target/details для каждого действия с календарём и
почтой. Каждая функция в `/lib/calendar` и `/lib/gmail` должна писать запись
в эту таблицу при реализации (сейчас — TODO-комментарий на месте вызова).

## Статус

Скелет проекта (структура, docker-compose, миграции, заглушки функций).
Реализация интеграций с Google API, Anthropic SDK и n8n workflow — следующий
этап.
