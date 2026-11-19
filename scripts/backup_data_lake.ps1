<#
.SYNOPSIS
    Sao luu (Backup) hoac Khoi phuc (Restore) 1 cham kho du lieu VBPL Data Foundation (Bronze + SQLite Warehouse)
    giua SSD cuc bo va thu muc Backup sach tren Google Drive (phuc vu chuyen may khong mat du lieu).
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/backup_data_lake.ps1 -Mode Backup
    powershell -ExecutionPolicy Bypass -File scripts/backup_data_lake.ps1 -Mode Restore -SnapshotZip "G:\...\vbpl_snapshot_latest.zip"
#>
param(
    [ValidateSet('Backup', 'Restore')]
    [string]$Mode = 'Backup',
    [string]$DataLakeRoot = $(if ($env:LEX_DATA_LAKE_ROOT) { $env:LEX_DATA_LAKE_ROOT } else { Join-Path (Split-Path -Parent $PSScriptRoot) '.local_data\vbpl' }),
    [string]$BackupDir = 'G:\My Drive\01_AI_SYSTEM\09_Apps_Project\LEX_PMO_OS_v3.0_SSOT_Project\08_DATA_BACKUPS',
    [string]$SnapshotZip = ''
)

$ErrorActionPreference = 'Stop'

if ($Mode -eq 'Backup') {
    if (-not (Test-Path $DataLakeRoot)) {
        throw "Khong tim thay Data Lake tai: $DataLakeRoot"
    }
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $zipPath = Join-Path $BackupDir "vbpl_data_foundation_$stamp.zip"
    $latestPath = Join-Path $BackupDir 'vbpl_data_foundation_LATEST.zip'
    $staging = Join-Path $env:TEMP "lex_pmo_backup_$stamp"
    New-Item -ItemType Directory -Force -Path $staging | Out-Null

    try {
        foreach ($sub in @('01_bronze', '04_warehouse')) {
            $srcSub = Join-Path $DataLakeRoot $sub
            if (Test-Path $srcSub) {
                Copy-Item -Recurse -Force $srcSub (Join-Path $staging $sub)
            }
        }
        # Loai bo file WAL/SHM tam neu co trong ban copy staging
        Get-ChildItem -Path $staging -Recurse -Include '*.sqlite-wal','*.sqlite-shm' -ErrorAction SilentlyContinue | Remove-Item -Force

        Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -Force
        Copy-Item -Force $zipPath $latestPath
        $sizeKb = [Math]::Round((Get-Item $zipPath).Length / 1KB, 2)
        Write-Host "[BACKUP OK] Da tao snapshot: $zipPath ($sizeKb KB)" -ForegroundColor Green
        Write-Host "[BACKUP OK] Cap nhat ban moi nhat: $latestPath" -ForegroundColor Green
    } finally {
        Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
    }
} else {
    $srcZip = if ($SnapshotZip) { $SnapshotZip } else { Join-Path $BackupDir 'vbpl_data_foundation_LATEST.zip' }
    if (-not (Test-Path $srcZip)) {
        throw "Khong tim thay file snapshot de khoi phuc: $srcZip"
    }
    New-Item -ItemType Directory -Force -Path $DataLakeRoot | Out-Null
    Expand-Archive -Path $srcZip -DestinationPath $DataLakeRoot -Force
    Write-Host "[RESTORE OK] Da giai nen $srcZip vao $DataLakeRoot" -ForegroundColor Green
    Write-Host 'Hay chay: python -B -m data_foundation.cli run-etl de tai tao Silver/Gold Parquet.' -ForegroundColor Yellow
}
