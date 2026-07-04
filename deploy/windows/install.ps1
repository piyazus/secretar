# Secretar — установка на Windows (запускать в PowerShell от администратора).
# 1) Ставит Docker Desktop (winget), 2) генерирует секреты в .env,
# 3) регистрирует автозапуск docker compose через Task Scheduler.
# cloudflared отдельно НЕ нужен — он работает контейнером внутри compose.

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "== 1/3 Docker Desktop =="
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    Write-Host "Docker Desktop установлен. ПЕРЕЗАГРУЗИТЕ компьютер, запустите Docker Desktop один раз (примите условия), затем запустите этот скрипт снова."
    exit 0
}

Write-Host "== 2/3 .env =="
$EnvFile = Join-Path $RepoRoot ".env"
if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $RepoRoot ".env.example") $EnvFile
    function Rand($n) { -join ((48..57)+(97..102) | Get-Random -Count $n | ForEach-Object {[char]$_}) }
    (Get-Content $EnvFile) `
        -replace '^POSTGRES_PASSWORD=$',    "POSTGRES_PASSWORD=$(Rand 48)" `
        -replace '^N8N_ENCRYPTION_KEY=$',   "N8N_ENCRYPTION_KEY=$(Rand 48)" `
        -replace '^N8N_BASIC_AUTH_USER=$',  "N8N_BASIC_AUTH_USER=admin" `
        -replace '^N8N_BASIC_AUTH_PASSWORD=$', "N8N_BASIC_AUTH_PASSWORD=$(Rand 24)" `
        -replace '^NEXTAUTH_SECRET=$',      "NEXTAUTH_SECRET=$(Rand 64)" `
        | Set-Content $EnvFile
    Write-Host ".env создан. ОБЯЗАТЕЛЬНО впишите вручную: ANTHROPIC_API_KEY, GOOGLE_CLIENT_SECRET, TUNNEL_TOKEN, TELEGRAM_BOT_TOKEN, DOMAIN."
} else {
    Write-Host ".env уже существует — пропускаю."
}

Write-Host "== 3/3 Автозапуск (Task Scheduler) =="
$Action  = New-ScheduledTaskAction -Execute "cmd.exe" `
    -Argument "/c cd /d `"$RepoRoot\infra`" && docker compose up -d"
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Trigger.Delay = "PT2M"  # ждём 2 мин, пока Docker Desktop поднимется
Register-ScheduledTask -TaskName "Secretar Compose Up" -Action $Action -Trigger $Trigger -Force | Out-Null
Write-Host "Задача 'Secretar Compose Up' зарегистрирована (при входе в систему, задержка 2 мин)."
Write-Host "Включите также в Docker Desktop: Settings -> General -> 'Start Docker Desktop when you sign in'."

Write-Host "Готово. Первый запуск: cd `"$RepoRoot\infra`"; docker compose up -d"
