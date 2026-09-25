<#
.SYNOPSIS
    Tự động tạo GitHub Release và đăng tải bản cập nhật kèm file `latest.json` cho Tauri Auto-Updater.

.DESCRIPTION
    Script này sẽ:
      1. Đọc phiên bản từ tauri.conf.json (ví dụ 1.0.0).
      2. Kiểm tra các file cài đặt và chữ ký số updater trong dist-windows/.
      3. Tạo file `latest.json` tương thích chuẩn Tauri v2 Auto-Updater.
      4. Tạo Git Tag (ví dụ v1.0.0) và đẩy lên GitHub.
      5. Tạo GitHub Release qua GitHub CLI (`gh release create`) và upload:
         - VongQuayMayMan_Setup.exe
         - VongQuayMayMan_Setup.zip
         - latest.json

.EXAMPLE
    .\scripts\Publish-Release.ps1 -Notes "Tối ưu hóa máy cấu hình thấp, sửa cỡ chữ và thêm tự động cập nhật"
#>

[CmdletBinding()]
param(
    [string]$Notes = "Bản phát hành Vòng Quay May Mắn",
    [switch]$Draft
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$distDir = Join-Path $repoRoot 'dist-windows'
$tauriConf = Join-Path $repoRoot 'src-tauri\tauri.conf.json'

$conf = Get-Content -LiteralPath $tauriConf -Raw | ConvertFrom-Json
$version = [string]$conf.version
$tagName = "v$version"
$repo = "hongducdev/vong-quay-may-man"

Write-Host "Chuẩn bị phát hành phiên bản: $tagName ($repo)" -ForegroundColor Cyan

$setupExe = Join-Path $distDir 'VongQuayMayMan_Setup.exe'
if (-not (Test-Path -LiteralPath $setupExe)) {
    throw "Không tìm thấy file cài đặt: $setupExe. Hãy chạy Build-Windows.ps1 trước."
}

# Đảm bảo có file zip
$zipPath = Join-Path $distDir 'VongQuayMayMan_Setup.zip'
if (-not (Test-Path -LiteralPath $zipPath)) {
    Write-Host "Đang nén file zip..."
    Compress-Archive -Path $setupExe -DestinationPath $zipPath -Force
}

# Tìm file chữ ký updater .sig do Tauri tạo ra
$sigFile = Get-ChildItem (Join-Path $repoRoot 'src-tauri\target\release\bundle\nsis') -Filter '*.sig' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

$signature = ""
if ($sigFile) {
    $signature = (Get-Content -LiteralPath $sigFile.FullName -Raw).Trim()
    Write-Host "Đã nạp chữ ký updater từ $($sigFile.Name)"
} else {
    Write-Warning "Không tìm thấy file chữ ký .sig của Tauri updater. Hãy kiểm tra khóa certs/updater.key."
}

# Tạo latest.json cho Tauri Updater
$nowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$latestJsonContent = @{
    version = $version
    notes = $Notes
    pub_date = $nowIso
    platforms = @{
        "windows-x86_64" = @{
            signature = $signature
            url = "https://github.com/$repo/releases/download/$tagName/VongQuayMayMan_Setup.exe"
        }
    }
}

$latestJsonPath = Join-Path $distDir 'latest.json'
$latestJsonContent | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $latestJsonPath -Encoding UTF8
Write-Host "Đã tạo latest.json" -ForegroundColor Green

# Kiểm tra git status
Push-Location $repoRoot
try {
    # Kiểm tra tag
    $existingTag = git tag -l $tagName
    if ($existingTag) {
        Write-Warning "Tag $tagName đã tồn tại trong git. Xóa tag cũ..."
        git tag -d $tagName
    }

    Write-Host "Tạo tag git $tagName..."
    git tag $tagName
    git push origin $tagName --force

    Write-Host "Đang tải lên GitHub Release..." -ForegroundColor Cyan
    $ghArgs = @(
        'release', 'create', $tagName,
        $setupExe,
        $zipPath,
        $latestJsonPath,
        '--title', "Vòng Quay May Mắn $tagName",
        '--notes', $Notes
    )

    if ($Draft) {
        $ghArgs += '--draft'
    }

    gh @ghArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "PHÁT HÀNH THÀNH CÔNG!" -ForegroundColor Green
        Write-Host "Xem tại: https://github.com/$repo/releases/tag/$tagName"
        Write-Host "Endpoint updater: https://github.com/$repo/releases/latest/download/latest.json"
    }
} finally {
    Pop-Location
}
