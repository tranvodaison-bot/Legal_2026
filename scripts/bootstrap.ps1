<#
.SYNOPSIS
    Khoi tao va kiem dinh moi truong chuan cho Legal_2026 tren BAT KY may Windows nao sau khi git clone.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1
    powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1 -SkipInstall
#>
param(
    [switch]$SkipInstall,
    [string]$DataLakeRoot = $env:LEX_DATA_LAKE_ROOT
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if (-not $DataLakeRoot) {
    $DataLakeRoot = Join-Path $RepoRoot '.local_data\vbpl'
}

Write-Host '====================================================================' -ForegroundColor Cyan
Write-Host ' LEX-PMO OS (Legal_2026) — MULTI-MACHINE BOOTSTRAP & VERIFY' -ForegroundColor Cyan
Write-Host " Repo Root      : $RepoRoot" -ForegroundColor Gray
Write-Host " Data Lake Root : $DataLakeRoot" -ForegroundColor Gray
Write-Host '====================================================================' -ForegroundColor Cyan

# 1. Verify Node.js & Python
Write-Host '[1/6] Kiem tra Node.js & Python...' -ForegroundColor Yellow
node -v
if ($LASTEXITCODE -ne 0) { throw 'Node.js chua duoc cai dat!' }
python --version
if ($LASTEXITCODE -ne 0) { throw 'Python chua duoc cai dat!' }

# 2. Ensure .env exists (never overwrite existing .env)
if (-not (Test-Path '.env') -and (Test-Path '.env.example')) {
    Copy-Item '.env.example' '.env'
    Write-Host '  -> Da tao .env tu .env.example (hay dien GEMINI_API_KEY neu dung AI).' -ForegroundColor DarkYellow
}

# 3. Install Node dependencies
if (-not $SkipInstall) {
    Write-Host '[2/6] Cai dat Node dependencies (npm install)...' -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install that bai!' }
} else {
    Write-Host '[2/6] Bo qua npm install (-SkipInstall).' -ForegroundColor DarkGray
}

# 4. TypeScript & Production Build
Write-Host '[3/6] Kiem tra TypeScript (npx tsc --noEmit)...' -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'tsc --noEmit phat hien loi!' }

Write-Host '[4/6] Chay Production Build (npm run build) & Bundle Budget (< 500 KB)...' -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build that bai!' }
npx tsx --test tests/bundle-budget.test.ts
if ($LASTEXITCODE -ne 0) { throw 'bundle-budget.test.ts that bai!' }

# 5. API & Frontend Smoke Tests
Write-Host '[5/6] Chay Smoke Tests (tests/api-smoke.test.ts)...' -ForegroundColor Yellow
npx tsx --test tests/api-smoke.test.ts
if ($LASTEXITCODE -ne 0) { throw 'api-smoke.test.ts that bai!' }

# 6. Python Data Foundation 6-Layer Tests & Init Local Data Lake
Write-Host '[6/6] Kiem tra Python Data Foundation (6 tang) & khoi tao SSD Lake...' -ForegroundColor Yellow
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PYTHONPATH = $RepoRoot
$env:LEX_DATA_LAKE_ROOT = $DataLakeRoot

python -B -m unittest discover -s tests -p 'test_data_foundation.py' -v
if ($LASTEXITCODE -ne 0) { throw 'test_data_foundation.py that bai!' }

python -B -m data_foundation.cli --root $DataLakeRoot status
if ($LASTEXITCODE -ne 0) { throw 'Khoi tao Data Lake status that bai!' }

Write-Host '====================================================================' -ForegroundColor Green
Write-Host ' HOAN TAT BOOTSTRAP: 100% XANH! San sang phat trien / van hanh.' -ForegroundColor Green
Write-Host '  - Chay Web Dev       : npm run dev' -ForegroundColor Gray
Write-Host '  - Chay Sidecar :8008 : python -B desktop-sidecar/local_scanner_engine.py' -ForegroundColor Gray
Write-Host '====================================================================' -ForegroundColor Green
