# installer/bootstrap.ps1 — «мозг» установки Secretar (ТЗ §2, §6).
# Запускается инсталлятором (secretar-setup.exe) после распаковки файлов.
# Сценарий «скачал → работает»: Docker → provisioning → .env → compose up → онбординг.
#
# Аргументы:
#   -InstallDir  куда распакованы файлы стека (по умолчанию папка скрипта/..)
# ASCII-only (PS 5.1 читает no-BOM как ANSI — кириллица ломает парсер).

param(
    [string]$InstallDir = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
)

$ErrorActionPreference = "Stop"
$ProvisionUrl = "https://secretar-provisioning.secretar.workers.dev/provision"
$log = Join-Path $InstallDir "install.log"
function Log($m) { "[$(Get-Date -Format 'HH:mm:ss')] $m" | Tee-Object -FilePath $log -Append | Out-Host }

Log "Secretar installer start. Dir=$InstallDir"

# --- 1. Docker Desktop ---
function Test-Docker { docker info *> $null; return ($LASTEXITCODE -eq 0) }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Log "Docker not found. Installing Docker Desktop via winget..."
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements *>> $log
    Log "Docker Desktop installed. A reboot may be required. Please reboot, then run this installer again."
    Start-Process "https://www.docker.com/products/docker-desktop/"
    exit 10
}

if (-not (Test-Docker)) {
    Log "Starting Docker Desktop..."
    $dd = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dd) { Start-Process $dd }
    $n = 0
    while (-not (Test-Docker) -and $n -lt 60) { Start-Sleep 5; $n++ }
    if (-not (Test-Docker)) { Log "DOCKER_TIMEOUT: start Docker Desktop manually, then re-run."; exit 11 }
}
Log "Docker is ready."

# --- 2. Provisioning: subdomain + tunnel token ---
$envPath = Join-Path $InstallDir ".env"
if (Test-Path $envPath) {
    Log ".env already exists — skipping provisioning (re-install)."
} else {
    $name = $env:SECRETAR_NAME
    if (-not $name) {
        $name = Read-Host "Choose a subdomain name (latin, e.g. ivan) -> ivan.secretarchik.online"
    }
    Log "Requesting provisioning for '$name'..."
    $resp = Invoke-RestMethod -Method Post -Uri $ProvisionUrl -ContentType "application/json" `
        -Body (@{ name = $name } | ConvertTo-Json)
    if (-not $resp.tunnel_token) { Log "Provisioning failed: $($resp | ConvertTo-Json -Compress)"; exit 20 }
    Log "Provisioned: $($resp.app_url)"

    # --- 3. Generate .env from template ---
    function Rand([int]$bytes) {
        $b = New-Object 'System.Byte[]' $bytes
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
        return ([System.BitConverter]::ToString($b) -replace '-', '').ToLower()
    }
    $tmpl = Get-Content (Join-Path $InstallDir ".env.example") -Raw
    $vals = @{
        "TUNNEL_TOKEN"          = $resp.tunnel_token
        "DOMAIN"                = "$($resp.subdomain).secretarchik.online"
        "NEXTAUTH_URL"          = $resp.app_url
        "GOOGLE_REDIRECT_URI"   = "$($resp.app_url)/api/auth/callback/google"
        "N8N_HOST"              = "$($resp.subdomain)-n8n.secretarchik.online"
        "N8N_WEBHOOK_URL"       = "http://n8n:5678/webhook/chat"
        "POSTGRES_PASSWORD"     = (Rand 24)
        "N8N_ENCRYPTION_KEY"    = (Rand 24)
        "N8N_BASIC_AUTH_USER"   = "admin"
        "N8N_BASIC_AUTH_PASSWORD" = (Rand 12)
        "NEXTAUTH_SECRET"       = [Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))
        "INTERNAL_API_TOKEN"    = (Rand 24)
        "TIMEZONE"              = "Asia/Almaty"
    }
    $out = foreach ($line in $tmpl -split "`n") {
        $m = [regex]::Match($line, '^([A-Z_]+)=')
        if ($m.Success -and $vals.ContainsKey($m.Groups[1].Value)) {
            "$($m.Groups[1].Value)=$($vals[$m.Groups[1].Value])"
        } else { $line.TrimEnd("`r") }
    }
    # Секреты, которые вводит пользователь в онбординге, оставляем пустыми:
    # ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID/SECRET, TELEGRAM_BOT_TOKEN, OWNER_EMAIL
    Set-Content -Path $envPath -Value ($out -join "`n") -Encoding UTF8 -NoNewline
    Log ".env generated."
}

# --- 4. Start stack ---
Log "Building & starting containers (first run 5-15 min)..."
Push-Location (Join-Path $InstallDir "infra")
docker compose --env-file ..\.env up -d --build *>> $log
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Log "COMPOSE_FAILED code=$code"; exit 30 }
Log "Stack is up."

# --- 5. Autostart on boot (Task Scheduler) ---
$taskName = "SecretarStack"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -Command `"cd '$InstallDir\infra'; docker compose --env-file ..\.env up -d`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Force -RunLevel Highest *>> $log
Log "Autostart registered ($taskName)."

# --- 6. Open onboarding ---
$appUrl = (Select-String -Path $envPath -Pattern '^NEXTAUTH_URL=(.+)$').Matches.Groups[1].Value
Log "Opening onboarding: $appUrl/onboarding"
Start-Process "$appUrl/onboarding"
Log "DONE. Secretar is installing/running. Onboarding opened in browser."
