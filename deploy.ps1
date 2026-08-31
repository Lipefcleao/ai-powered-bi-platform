# 1. Build do Frontend
Write-Host "Construindo o Frontend (Vite)..." -ForegroundColor Cyan
npm run build

# 2. Carrega as variáveis do arquivo .env se ele existir na raiz
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Host "Carregando configurações do arquivo .env..." -ForegroundColor Yellow
    Get-Content $envFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $parts = $_.Split('=', 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        # Remove aspas se existirem
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($key, $value)
    }
}

# 3. Lendo variáveis do ambiente de forma segura
$demoMode = $env:DEMO_MODE
if ([string]::IsNullOrEmpty($demoMode)) {
    $demoMode = "true" # Default seguro
}

$geminiKey = $env:GEMINI_API_KEY
if ([string]::IsNullOrEmpty($geminiKey)) {
    $geminiKey = $env:VITE_GEMINI_API_KEY
}
$geminiModel = $env:VITE_GEMINI_MODEL
if ([string]::IsNullOrEmpty($geminiModel)) {
    $geminiModel = "gemini-3.1-flash-lite"
}
$accessPassword = $env:ACCESS_PASSWORD

if ($demoMode -eq "true") {
    if ([string]::IsNullOrEmpty($geminiKey)) {
        $geminiKey = "MOCK_KEY_DEMO_ACTIVE"
    }
    if ([string]::IsNullOrEmpty($accessPassword)) {
        $accessPassword = "demo_access_password"
    }
    $dbHost = "localhost"
    $dbUser = "demo_user"
    $dbPass = "demo_password"
} else {
    if ([string]::IsNullOrEmpty($accessPassword)) {
        $accessPassword = "flowup_cs_test"
    }
    $dbHost = $env:DB_HOST
    $dbUser = $env:DB_USER
    $dbPass = $env:DB_PASSWORD
}

# Validação Fail-Closed: Impede deploy com variáveis vazias
if ([string]::IsNullOrEmpty($geminiKey) -or [string]::IsNullOrEmpty($dbHost) -or [string]::IsNullOrEmpty($dbUser) -or [string]::IsNullOrEmpty($dbPass)) {
    Write-Error "Erro Crítico: Variáveis essenciais de ambiente (GEMINI_API_KEY / VITE_GEMINI_API_KEY, DB_HOST, DB_USER, DB_PASSWORD) não foram encontradas no .env ou no sistema."
    exit 1
}

# 4. Fazendo o Deploy
Write-Host "Iniciando Deploy para o Google Cloud Run..." -ForegroundColor Cyan
Write-Host "Projeto: analytics-bi" -ForegroundColor Yellow

# Build e push da imagem para o Google Container Registry (GCR)
Write-Host "Enviando código e compilando imagem no Container Registry..." -ForegroundColor Cyan
gcloud builds submit --tag gcr.io/analytics-flowup/bi-dashboard:latest

# Comando de deploy usando a imagem compilada
gcloud run deploy bi-dashboard `
  --image gcr.io/analytics-flowup/bi-dashboard:latest `
  --port 3001 `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars="DEMO_MODE=$demoMode,VITE_GEMINI_API_KEY=$geminiKey,VITE_GEMINI_MODEL=$geminiModel,ACCESS_PASSWORD=$accessPassword,DB_HOST=$dbHost,DB_USER=$dbUser,DB_PASS=$dbPass"

Write-Host "Deploy finalizado! A URL pública aparecerá acima." -ForegroundColor Green
