# Consulta o PostgreSQL da demo usando as credenciais do .env (sem pedir senha).
# Uso: .\scripts\consultar-banco.ps1                -> mostra tabelas, usuarios e pacientes
#      .\scripts\consultar-banco.ps1 -Interativo    -> abre o terminal psql
param([switch]$Interativo)
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $project
. (Join-Path $PSScriptRoot 'comum-windows.ps1')
$settings = Read-EnvFile (Join-Path $project '.env')
$psql = Find-PostgresTool 'psql.exe'
$env:PGPASSWORD = $settings['DB_PASSWORD']
$env:PGCLIENTENCODING = 'UTF8'
$conn = @('-h', $settings['DB_HOST'], '-p', $settings['DB_PORT'], '-U', $settings['DB_USER'], '-d', $settings['DB_NAME'], '-X')

$consultas = [ordered]@{
    'Tabelas do banco' =
        "SELECT table_name AS tabela FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;"
    'Usuarios (a senha fica guardada somente como hash scrypt)' =
        "SELECT name AS nome, email, role AS cargo, active AS ativo, left(password_hash, 40) || '...' AS hash_da_senha FROM users ORDER BY created_at;"
    'Pacientes' =
        "SELECT name AS nome, cpf, TO_CHAR(birth_date,'DD/MM/YYYY') AS nascimento, phone AS telefone, email, CASE WHEN active THEN 'ativo' ELSE 'inativo' END AS situacao, TO_CHAR(updated_at,'DD/MM HH24:MI:SS') AS atualizado_em FROM patients ORDER BY created_at;"
}

try {
    if ($Interativo) { & $psql @conn; return }
    # A saida vai para um arquivo UTF-8 e e exibida pelo PowerShell, evitando acentos quebrados no console.
    $out = Join-Path $env:TEMP ('plm-consulta-' + [guid]::NewGuid().ToString('N') + '.txt')
    foreach ($titulo in $consultas.Keys) {
        Write-Host "`n== $titulo ==" -ForegroundColor Cyan
        & $psql @conn -q -c $consultas[$titulo] -o $out
        if ($LASTEXITCODE -ne 0) { Write-Host 'Falha na consulta. O PostgreSQL da demo esta em execucao?' -ForegroundColor Red; break }
        Get-Content -LiteralPath $out -Encoding UTF8 | ForEach-Object { Write-Host $_ }
    }
    Remove-Item -LiteralPath $out -ErrorAction SilentlyContinue
} finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
