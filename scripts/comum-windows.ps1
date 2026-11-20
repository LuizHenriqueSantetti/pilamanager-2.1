# Funcoes compartilhadas pelos scripts de Windows (modo PostgreSQL local, sem Docker).
# A demo usa uma instancia PostgreSQL propria (pasta e porta separadas), criada com os
# programas do PostgreSQL ja instalado. Nao altera outros bancos nem a senha do "postgres".

function Write-Titulo([string]$message) { Write-Host "`n== $message ==" -ForegroundColor Cyan }
function Stop-ComMensagem([string]$message) { Write-Host "`nERRO: $message" -ForegroundColor Red; exit 1 }

function New-DemoSecret {
    $bytes = New-Object byte[] 24
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Find-PostgresTool([string]$exe) {
    $cmd = Get-Command $exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $found = Get-ChildItem (Join-Path 'C:\Program Files\PostgreSQL\*\bin' $exe) -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

function Get-PostgresTools {
    $tools = @{}
    foreach ($name in 'initdb','pg_ctl','psql','pg_isready') {
        $tools[$name] = Find-PostgresTool "$name.exe"
        if (-not $tools[$name]) { Stop-ComMensagem "$name.exe nao encontrado. Instale o PostgreSQL 16 ou 17 para Windows." }
    }
    return $tools
}

function Read-EnvFile([string]$path) {
    $settings = @{}
    foreach ($line in (Get-Content -LiteralPath $path)) {
        if ($line -match '^\s*([^#=\s]+)\s*=(.*)$') { $settings[$matches[1]] = $matches[2].Trim() }
    }
    return $settings
}

# Cria o .env com senhas aleatorias na primeira execucao; depois apenas le o existente.
function Initialize-EnvFile([string]$project) {
    $envPath = Join-Path $project '.env'
    if (-not (Test-Path $envPath)) {
        $dbPass = New-DemoSecret
        @(
            '# Gerado automaticamente. Nao compartilhe este arquivo.',
            'PORT=3000',
            'DB_HOST=127.0.0.1',
            'DB_PORT=5434',
            'DB_NAME=pilamanager_demo',
            'DB_USER=pilamanager_demo',
            "POSTGRES_PASSWORD=$dbPass",
            "DB_PASSWORD=$dbPass",
            ('PG_DATA_DIR=' + (Join-Path $env:LOCALAPPDATA 'PilaManagerDemo\postgres-data')),
            ('PG_SUPERUSER_PASSWORD=' + (New-DemoSecret)),
            'DEMO_ADMIN_EMAIL=gestao.demo@pilamanager.local',
            'DEMO_ADMIN_NAME=Gerencia Demonstracao',
            ('DEMO_ADMIN_PASSWORD=' + (New-DemoSecret).Substring(0,20)),
            'COOKIE_SECURE=false',
            'NODE_ENV=development'
        ) | Set-Content -LiteralPath $envPath -Encoding Ascii
        Write-Host 'Arquivo .env criado com senhas aleatorias.' -ForegroundColor Green
    }
    $settings = Read-EnvFile $envPath
    foreach ($key in 'DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','PG_DATA_DIR','PG_SUPERUSER_PASSWORD','DEMO_ADMIN_EMAIL','DEMO_ADMIN_PASSWORD') {
        if (-not $settings[$key]) { Stop-ComMensagem "O arquivo .env esta sem $key. Renomeie-o para .env.antigo e execute novamente." }
    }
    if ($settings['DB_PASSWORD'] -notmatch '^[A-Za-z0-9_-]{16,}$') { Stop-ComMensagem 'DB_PASSWORD deve ter 16+ caracteres (letras, numeros, - ou _).' }
    return $settings
}

function Test-DemoPostgresRunning($tools, $settings) {
    & $tools.pg_ctl status -D $settings['PG_DATA_DIR'] *> $null
    return ($LASTEXITCODE -eq 0)
}

# Cria a instancia (uma unica vez), inicia o PostgreSQL e garante usuario + banco da demo.
function Start-DemoPostgres($tools, $settings) {
    $data = $settings['PG_DATA_DIR']
    if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
        Write-Host "Criando a instancia PostgreSQL da demo em: $data"
        New-Item -ItemType Directory -Force (Split-Path $data) | Out-Null
        $pwFile = Join-Path $env:TEMP ('plm-' + [guid]::NewGuid().ToString('N'))
        Set-Content -LiteralPath $pwFile -Value $settings['PG_SUPERUSER_PASSWORD'] -Encoding Ascii -NoNewline
        try { & $tools.initdb -D $data -U postgres -E UTF8 --no-locale --auth=scram-sha-256 "--pwfile=$pwFile" | Out-Host }
        finally { Remove-Item -LiteralPath $pwFile -ErrorAction SilentlyContinue }
        if ($LASTEXITCODE -ne 0) { Stop-ComMensagem 'initdb falhou ao criar a instancia PostgreSQL.' }
        Add-Content -LiteralPath (Join-Path $data 'postgresql.conf') -Encoding Ascii -Value @(
            '', '# PilaManager Demo', "port = $($settings['DB_PORT'])", "listen_addresses = '127.0.0.1'")
    }
    if (-not (Test-DemoPostgresRunning $tools $settings)) {
        Write-Host 'Iniciando o PostgreSQL da demo...'
        # Sem captura de saida: o processo do PostgreSQL herdaria o pipe e o script ficaria travado.
        $info = New-Object System.Diagnostics.ProcessStartInfo $tools.pg_ctl
        $info.Arguments = 'start -w -t 60 -D "' + $data + '" -l "' + (Join-Path $data 'postgres.log') + '"'
        $info.UseShellExecute = $false
        $info.CreateNoWindow = $true
        $pgCtl = [System.Diagnostics.Process]::Start($info)
        $pgCtl.WaitForExit()
        if ($pgCtl.ExitCode -ne 0) { Stop-ComMensagem "O PostgreSQL nao iniciou. Veja $data\postgres.log" }
        Write-Host 'PostgreSQL da demo iniciado.' -ForegroundColor Green
    } else { Write-Host 'PostgreSQL da demo ja estava em execucao.' }
    & $tools.pg_isready -h 127.0.0.1 -p $settings['DB_PORT'] | Out-Host
    if ($LASTEXITCODE -ne 0) { Stop-ComMensagem "PostgreSQL nao responde na porta $($settings['DB_PORT'])." }

    # Usuario da aplicacao (sem privilegios de superusuario) e banco proprio. Idempotente.
    $u = $settings['DB_USER']; $db = $settings['DB_NAME']; $p = $settings['DB_PASSWORD']
    $sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$u') THEN
    CREATE ROLE $u LOGIN PASSWORD '$p';
  END IF;
END
`$`$;
SELECT 'CREATE DATABASE $db OWNER $u' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$db')\gexec
"@
    $env:PGPASSWORD = $settings['PG_SUPERUSER_PASSWORD']
    try { $sql | & $tools.psql -h 127.0.0.1 -p $settings['DB_PORT'] -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X | Out-Host }
    finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    if ($LASTEXITCODE -ne 0) { Stop-ComMensagem 'Nao foi possivel preparar o usuario/banco da demo.' }
}

function Stop-DemoPostgres($tools, $settings) {
    if (Test-DemoPostgresRunning $tools $settings) {
        & $tools.pg_ctl stop -D $settings['PG_DATA_DIR'] -m fast -w | Out-Host
    } else { Write-Host 'O PostgreSQL da demo ja estava parado.' }
}
