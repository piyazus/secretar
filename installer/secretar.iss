; secretar.iss — Inno Setup скрипт сборки secretar-setup.exe (ТЗ §2, §7).
; Компиляция: ISCC.exe secretar.iss  (устанавливается из Inno Setup 6).
; Кладёт весь стек (frontend, lib, infra, n8n, wa-bridge, .env.example) в
; ProgramData\Secretar и запускает bootstrap.ps1 (Docker → provisioning → onboarding).

#define AppName "Secretar"
#define AppVersion "2.0"
#define Publisher "Secretar"
; Корень репозитория относительно этого файла (installer/..)
#define RepoRoot ".."

[Setup]
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#Publisher}
DefaultDirName={commonpf}\Secretar
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputBaseFilename=secretar-setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern
SetupLogging=yes

[Languages]
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[Files]
; Стек целиком (исключаем локальные секреты и временные каталоги)
Source: "{#RepoRoot}\frontend\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs createallsubdirs; Excludes: "node_modules,.next"
Source: "{#RepoRoot}\lib\*";      DestDir: "{app}\lib";      Flags: recursesubdirs createallsubdirs
Source: "{#RepoRoot}\infra\*";    DestDir: "{app}\infra";    Flags: recursesubdirs createallsubdirs; Excludes: "postgres-data,n8n-data,caddy-data,caddy-config"
Source: "{#RepoRoot}\n8n\*";      DestDir: "{app}\n8n";      Flags: recursesubdirs createallsubdirs
Source: "{#RepoRoot}\wa-bridge\*"; DestDir: "{app}\wa-bridge"; Flags: recursesubdirs createallsubdirs; Excludes: "node_modules,auth"
Source: "{#RepoRoot}\.env.example"; DestDir: "{app}"; DestName: ".env.example"
Source: "bootstrap.ps1";          DestDir: "{app}\installer"

[Run]
; После копирования файлов запускаем bootstrap (окно PowerShell видно пользователю)
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installer\bootstrap.ps1"" -InstallDir ""{app}"""; \
  StatusMsg: "Разворачиваю Secretar (Docker, туннель, сервисы)..."; \
  Flags: waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -Command ""cd '{app}\infra'; docker compose --env-file ..\.env down; schtasks /delete /tn SecretarStack /f"""; \
  Flags: runhidden; RunOnceId: "DownStack"
