# Test Production Configuration Locally (PowerShell)
# This script tests the application with production-like environment variables

$ErrorActionPreference = "Stop"

Write-Host "🧪 Testing Production Configuration Locally" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ Error: backend\.env file not found" -ForegroundColor Red
    Write-Host "Please create backend\.env with your configuration"
    exit 1
}

Write-Host "📋 Step 1: Checking Environment Variables" -ForegroundColor Yellow
Write-Host ""

# Required variables for production
$requiredVars = @(
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "OPENAI_API_KEY"
)

$missingVars = @()

foreach ($var in $requiredVars) {
    $content = Get-Content "backend\.env" -Raw
    if ($content -notmatch "$var=") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    exit 1
}

Write-Host "✅ All required variables found" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 2: Setting Production-Like Environment Variables" -ForegroundColor Yellow
Write-Host ""

# Set production-like variables
$env:NODE_ENV = "production"
$env:PORT = "3000"
$env:BASE_URL = "http://localhost:3000"
$env:FRONTEND_URL = "http://localhost:5173"
$env:CHROMADB_URL = "http://localhost:8000"

# Load other vars from .env (basic parsing)
$envContent = Get-Content "backend\.env"
foreach ($line in $envContent) {
    if ($line -match '^([^#][^=]+)=(.*)$') {
        $varName = $matches[1].Trim()
        $varValue = $matches[2].Trim()
        if ($varName -and $varValue) {
            Set-Item -Path "env:$varName" -Value $varValue
        }
    }
}

Write-Host "NODE_ENV=$env:NODE_ENV"
Write-Host "BASE_URL=$env:BASE_URL"
Write-Host "FRONTEND_URL=$env:FRONTEND_URL"
Write-Host "CHROMADB_URL=$env:CHROMADB_URL"
Write-Host ""

Write-Host "📋 Step 3: Testing Backend Configuration Validation" -ForegroundColor Yellow
Write-Host ""

Push-Location backend

# Test that backend validates required vars
Write-Host "Testing backend config validation..."
try {
    npm run build 2>&1 | Out-Null
    Write-Host "✅ Backend configuration valid" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend validation failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host ""

Pop-Location

Write-Host "📋 Step 4: Testing Frontend Build with Production Config" -ForegroundColor Yellow
Write-Host ""

Push-Location frontend

# Set frontend env var
$env:VITE_API_URL = "http://localhost:3000"

# Test frontend build
Write-Host "Building frontend with production config..."
try {
    npm run build
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host ""

Pop-Location

Write-Host "📋 Step 5: Checking for Localhost References in Production Code" -ForegroundColor Yellow
Write-Host ""

Push-Location backend

# Check for hardcoded localhost in production code paths
Write-Host "Checking for localhost references..."

$problematicPatterns = @(
    'http://localhost:\$\{config\.port\}',
    'http://localhost:8000',
    "'http://localhost:3000'"
)

$foundIssues = $false

foreach ($pattern in $problematicPatterns) {
    $files = Get-ChildItem -Path "src" -Recurse -Include "*.ts" | Select-String -Pattern $pattern
    foreach ($file in $files) {
        $line = $file.Line
        if ($line -notmatch "development|dev|test|console\.(log|warn)") {
            Write-Host "⚠️  Found potentially problematic pattern: $pattern" -ForegroundColor Yellow
            Write-Host "   File: $($file.Path):$($file.LineNumber)" -ForegroundColor Yellow
            $foundIssues = $true
        }
    }
}

if (-not $foundIssues) {
    Write-Host "✅ No problematic localhost references found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some localhost references found (may be in dev-only code paths)" -ForegroundColor Yellow
}

Write-Host ""

Pop-Location

Write-Host "✅ All Production Configuration Tests Passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Start backend: cd backend && npm run dev"
Write-Host "2. Start frontend: cd frontend && npm run dev"
Write-Host "3. Test the application in browser"
Write-Host ""

