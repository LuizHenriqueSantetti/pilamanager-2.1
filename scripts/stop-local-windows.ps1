# Encerra o servidor e o banco de dados. Os cadastros continuam gravados em disco.
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $project
. (Join-Path $PSScriptRoot 'comum-windows.ps1')
$pidFile = Join-Path $project 'logs\servidor.pid'

Write-Titulo 'Encerrando o PilaManager'
if (Test-Path $pidFile) {
    $serverPid = [int](Get-Content -LiteralPath $pidFile -TotalCount 1)
    $proc = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') {
        Stop-Process -Id $serverPid -Force
        Write-Host "Servidor encerrado (PID $serverPid)." -ForegroundColor Green
    } else { Write-Host 'O servidor ja estava encerrado.' }
    Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue
} else { Write-Host 'Nenhum servidor iniciado por este projeto foi encontrado.' }

if (Test-Path (Join-Path $project '.env')) {
    Stop-DemoPostgres (Get-PostgresTools) (Read-EnvFile (Join-Path $project '.env'))
}
Write-Host 'Os dados continuam salvos no PostgreSQL.' -ForegroundColor Green
