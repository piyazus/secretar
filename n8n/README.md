# /n8n

Директория для экспортированных workflow n8n (JSON), которые монтируются в
контейнер n8n как `/workflows` (read-only, см. `infra/docker-compose.yml`).

## Что сюда класть
- `router.json` — workflow-роутер: принимает вебхук от frontend (`/api/chat`),
  вызывает Haiku для классификации intent, разводит на соответствующий подпроцесс.
- `calendar-actions.json` — CRUD встреч через Google Calendar API.
- `gmail-actions.json` — чтение/отправка писем через Gmail API.
- `audit-log.json` — sub-workflow, вызываемый после каждого действия, пишет
  запись в таблицу `audit_log` (postgres).

## Импорт
После первого запуска `docker compose up`, зайти в n8n UI
(`https://n8n.<DOMAIN>`, логин/пароль из `N8N_BASIC_AUTH_USER/PASSWORD`) и
импортировать workflow вручную (Import from File), либо через n8n CLI:

```bash
docker compose exec n8n n8n import:workflow --input=/workflows/router.json
```
