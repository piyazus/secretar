# deploy-run.ps1 - start/update Secretar stack (docker compose up -d --build)
# Log: deploy.log next to this script. ASCII only (PS 5.1 reads no-BOM as ANSI).
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $root "deploy.log"

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] deploy start" | Out-File $log -Encoding utf8

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    "Docker not running - starting Docker Desktop..." | Out-File $log -Append -Encoding utf8
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    $n = 0
    do {
        Start-Sleep -Seconds 5
        $n++
        docker info *> $null
    } while ($LASTEXITCODE -ne 0 -and $n -lt 60)
    if ($LASTEXITCODE -ne 0) {
        "DOCKER_TIMEOUT after 5 min" | Out-File $log -Append -Encoding utf8
        exit 1
    }
}
"Docker ready." | Out-File $log -Append -Encoding utf8

Set-Location (Join-Path $root "infra")
docker compose --env-file ..\.env up -d --build *>> $log
"COMPOSE_EXIT=$LASTEXITCODE" | Out-File $log -Append -Encoding utf8
docker compose --env-file ..\.env ps *>> $log
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] deploy done" | Out-File $log -Append -Encoding utf8
