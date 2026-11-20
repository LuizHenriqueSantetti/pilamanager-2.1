# Inicia o PilaManager usando o PostgreSQL instalado no Windows (sem Docker).
# Na primeira execucao cria a instancia banco de dados; nas seguintes apenas a inicia.
# So informa sucesso depois que http://localhost:3000/api/health responder "ok".
$ErrorActionPreference = 'Continue'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $project
. (Join-Path $PSScriptRoot 'comum-windows.ps1')
$logs = Join-Path $project 'logs'
$pidFile = Join-Path $logs 'servidor.pid'

Write-Titulo 'PilaManager 2.1'

Write-Titulo '1. Verificando Node.js'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-ComMensagem 'Node.js nao encontrado. Instale o Node.js LTS (https://nodejs.org) e execute novamente.'
}
Write-Host ('Node.js ' + (& node --version))

Write-Titulo '2. Preparando e iniciando o banco de dados'
$tools = Get-PostgresTools
$settings = Initialize-EnvFile $project
Start-DemoPostgres $tools $settings

Write-Titulo '3. Conferindo dependencias'
if (-not (Test-Path (Join-Path $project 'node_modules\pg'))) {
    & npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Stop-ComMensagem 'Falha ao instalar dependencias (npm install).' }
} else { Write-Host 'Dependencias ja instaladas.' }

Write-Titulo '4. Atualizando o banco de dados'
& node scripts/migrate.js
if ($LASTEXITCODE -ne 0) { Stop-ComMensagem 'Migration falhou. Veja a mensagem acima.' }
& node scripts/seed.js
if ($LASTEXITCODE -ne 0) { Stop-ComMensagem 'Seed falhou. Veja a mensagem acima.' }

Write-Titulo '5. Iniciando o servidor'
$port = $settings['PORT']; if (-not $port) { $port = '3000' }
$health = "http://127.0.0.1:$port/api/health"
$alreadyUp = $false
try { $alreadyUp = (Invoke-RestMethod -Uri $health -TimeoutSec 3).status -eq 'ok' } catch { }
if ($alreadyUp) {
    Write-Host 'O servidor ja estava em execucao.'
} else {
    $busy = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($busy) { Stop-ComMensagem "A porta $port esta ocupada por outro programa (PID $($busy[0].OwningProcess))." }
    New-Item -ItemType Directory -Force $logs | Out-Null
    $proc = Start-Process -FilePath (Get-Command node).Source -ArgumentList 'server/index.js' -WorkingDirectory $project `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logs 'servidor.log') -RedirectStandardError (Join-Path $logs 'servidor-erros.log')
    Set-Content -LiteralPath $pidFile -Value $proc.Id -Encoding Ascii
    $ok = $false
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds 1
        try { if ((Invoke-RestMethod -Uri $health -TimeoutSec 3).status -eq 'ok') { $ok = $true; break } } catch { }
        if ($proc.HasExited) { break }
    }
    if (-not $ok) {
        Write-Host "`nUltimas mensagens do servidor:" -ForegroundColor Yellow
        Get-Content (Join-Path $logs 'servidor-erros.log'), (Join-Path $logs 'servidor.log') -Tail 30 -ErrorAction SilentlyContinue
        Stop-ComMensagem "O servidor nao respondeu em $health."
    }
}

Write-Titulo '6. Tudo pronto'
Write-Host 'PostgreSQL conectado e API respondendo.' -ForegroundColor Green
Write-Host "Endereco: http://localhost:$port" -ForegroundColor Green
Write-Host ('Usuario:  ' + $settings['DEMO_ADMIN_EMAIL'])
Write-Host ('Senha:    ' + $settings['DEMO_ADMIN_PASSWORD'])
Write-Host 'Para encerrar, execute PARAR.bat (os dados continuam salvos).'
if ($env:PILAMANAGER_NO_BROWSER -ne '1') { Start-Process "http://localhost:$port" }
exit 0
