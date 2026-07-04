# Установка Secretar на компьютер-сервер (Windows)

Все токены уже вписаны в `.env` (лежит в этой папке, в git не попадает).

## 0. Перенести проект
Скопировать папку `secretar-repo` целиком (вместе со скрытым файлом `.env`!)
на компьютер-сервер, например в `C:\secretar`. GitHub-репозиторий приватный
(github.com/piyazus/secretar), у заказчика доступа нет — переносить файлами
(USB/облако) или дать доступ к репо + PAT.

## 1. Установка (PowerShell от администратора)
```powershell
cd C:\secretar
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\windows\install.ps1
```
Скрипт ставит Docker Desktop и регистрирует автозапуск. После установки:
перезагрузка → запустить Docker Desktop один раз → принять условия →
Settings → General → включить «Start Docker Desktop when you sign in» →
запустить `install.ps1` ещё раз (зарегистрирует задачу автозапуска compose).

## 2. Первый запуск
```powershell
cd C:\secretar\infra
docker compose up -d      # первая сборка 5–15 минут
docker compose ps         # все сервисы должны быть Up/healthy
```

## 3. Проверка туннеля
Cloudflare → Zero Trust → Networks → Connectors → туннель `secretar`
должен стать **Active** (сейчас Inactive — станет активен сам после запуска).
После смены NS у домена (см. ниже) открыть https://app.secretarchik.online

## 4. n8n: импорт workflow и токен бота
```powershell
docker compose exec n8n n8n import:workflow --input=/workflows/router.json
```
Затем в браузере https://n8n.secretarchik.online (логин/пароль — `N8N_BASIC_AUTH_USER/PASSWORD`
из `.env`): открыть workflow «Secretar Router» → в узлах Telegram создать
credential с токеном `TELEGRAM_BOT_TOKEN` из `.env` → Activate.

## 5. Настройки Windows (обязательно для сервера)
- Электропитание: «Никогда не переводить в спящий режим»
- Автовход в Windows (netplwiz) — иначе после перезагрузки docker не стартует
  до ручного входа

## Внешние шаги (вне этого компьютера)
- [ ] Namecheap → secretarchik.online → Nameservers → Custom DNS:
      `haley.ns.cloudflare.com`, `seamus.ns.cloudflare.com`
- [ ] Google Cloud: проект secretar-friend, Calendar+Gmail API, OAuth client
      (redirect: https://app.secretarchik.online/api/auth/callback/google),
      CLIENT_ID/SECRET → в `.env`, `docker compose restart frontend`
- [ ] WhatsApp: Meta Business + Cloud API, верификация номера заказчика
- [ ] Аватар бота: BotFather → /setuserpic (фото: frontend/public/icons/icon-512.png)

## Что уже сделано
- Код: github.com/piyazus/secretar (private)
- Домен secretarchik.online в Cloudflare, маршруты туннеля:
  app → frontend:3000, n8n → n8n:5678 (DNS-записи созданы)
- Telegram-бот @secretar_dbaitulenov_bot (описание, команды; токен в .env)
- Anthropic API-ключ в .env, кредиты куплены
- Секреты (postgres, n8n, nextauth) сгенерированы в .env
