#Requires -Version 5.1
<#
    Khởi động Vòng Quay May Mắn + tự động tải và cài Microsoft Edge WebView2 nếu máy còn thiếu.

    Vì sao cần file này?
      Ứng dụng được xây dựng bằng Tauri, giao diện chạy trong Microsoft Edge WebView2.
      Windows 11 và Windows 10 đã cập nhật thì đã có sẵn WebView2. Nhưng Windows 10 đời cũ
      (hoặc bản Windows LTSC / "N" đã bị lược bớt) có thể CHƯA có WebView2 - khi đó
      VongQuayMayMan.exe sẽ không mở lên được.

      File này sẽ: kiểm tra -> tải về -> cài đặt WebView2 -> mở ứng dụng.

    Lưu ý: bước tải về CẦN INTERNET. Nếu máy không có Internet, hãy dùng bộ cài được build
    với tuỳ chọn -OfflineWebView2 (xem packaging/HUONG_DAN_KY_UNGDUNG.md), hoặc cài WebView2
    thủ công bằng "Evergreen Standalone Installer" của Microsoft.
#>

[CmdletBinding()]
param(
    # Cài lại WebView2 dù máy đã có.
    [switch]$Force,

    # Chỉ kiểm tra / cài WebView2 mà không mở ứng dụng (dùng để kiểm tra máy).
    [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'

# Hiển thị tiếng Việt đúng trong cửa sổ console.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$OutputEncoding = [System.Text.Encoding]::UTF8

$WebView2ClientId = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$BootstrapperUrl = 'https://go.microsoft.com/fwlink/p/?LinkId=2124703'

$root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path $MyInvocation.MyCommand.Path -Parent }
$appExe = Join-Path $root 'VongQuayMayMan.exe'

function Write-Title {
    param([string]$Text)
    Write-Host ''
    Write-Host '======================================================' -ForegroundColor DarkCyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host '======================================================' -ForegroundColor DarkCyan
}

function Write-Step { param([string]$Text) Write-Host "  -> $Text" }
function Write-Ok { param([string]$Text) Write-Host "  [OK] $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "  [!] $Text" -ForegroundColor Yellow }
function Write-Err { param([string]$Text) Write-Host "  [X] $Text" -ForegroundColor Red }

function Get-WindowsInfo {
    $v = [Environment]::OSVersion.Version
    $build = $v.Build

    $name = 'Windows'
    if ($v.Major -eq 10 -and $build -ge 22000) { $name = 'Windows 11' }
    elseif ($v.Major -eq 10) { $name = 'Windows 10' }
    elseif ($v.Major -eq 6 -and $v.Minor -eq 3) { $name = 'Windows 8.1' }
    elseif ($v.Major -eq 6 -and $v.Minor -eq 1) { $name = 'Windows 7' }

    [pscustomobject]@{
        Name           = $name
        Build          = $build
        # Chỉ Windows 10 trở xuống mới hay thiếu WebView2.
        IsWin10OrOlder = ($v.Major -lt 10 -or ($v.Major -eq 10 -and $build -lt 22000))
    }
}

function Get-WebView2Version {
    <#
        WebView2 đăng ký ở 3 nơi (máy ảo hoá 32-bit, 64-bit và theo người dùng).
        Kiểm tra thêm thư mục cài đặt để đề phòng registry bị dọn sạch.
    #>
    $regPaths = @(
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$WebView2ClientId",
        "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$WebView2ClientId",
        "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$WebView2ClientId"
    )

    foreach ($p in $regPaths) {
        try {
            $pv = (Get-ItemProperty -Path $p -Name 'pv' -ErrorAction Stop).pv
            if ($pv -and $pv -ne '0.0.0.0') { return $pv }
        } catch {
            # Không có khoá này - thử nơi tiếp theo.
        }
    }

    $dirs = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\EdgeWebView\Application'),
        (Join-Path $env:ProgramFiles 'Microsoft\EdgeWebView\Application')
    )
    foreach ($dir in $dirs) {
        if (-not $dir -or -not (Test-Path -LiteralPath $dir)) { continue }
        $found = Get-ChildItem -LiteralPath $dir -Directory -ErrorAction SilentlyContinue |
            Sort-Object -Property Name -Descending |
            ForEach-Object { Join-Path $_.FullName 'msedgewebview2.exe' } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
        if ($found) { return 'đã cài đặt' }
    }

    return $null
}

function Install-WebView2 {
    $temp = Join-Path $env:TEMP 'MicrosoftEdgeWebview2Setup.exe'
    if (Test-Path -LiteralPath $temp) {
        Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    }

    try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }

    Write-Step 'Đang tải WebView2 Runtime từ Microsoft...'
    $progress = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    try {
        Invoke-WebRequest -Uri $BootstrapperUrl -OutFile $temp -UseBasicParsing -TimeoutSec 300
    } catch {
        $ProgressPreference = $progress
        throw "Không tải được WebView2 (hãy kiểm tra kết nối Internet). Chi tiết: $($_.Exception.Message)"
    } finally {
        $ProgressPreference = $progress
    }
    Write-Ok 'Đã tải xong.'

    Write-Step 'Đang cài đặt WebView2 (có thể mất 1-2 phút, vui lòng đợi)...'
    $proc = Start-Process -FilePath $temp -ArgumentList '/silent', '/install' -Wait -PassThru
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue

    if ($proc.ExitCode -ne 0) {
        throw "Trình cài đặt WebView2 trả về mã lỗi $($proc.ExitCode)."
    }
    Write-Ok 'Đã cài đặt xong.'
}

function Start-App {
    if (-not (Test-Path -LiteralPath $appExe)) {
        Write-Err "Không tìm thấy file: $appExe"
        Write-Host '     Hãy chắc chắn file VongQuayMayMan.exe nằm cùng thư mục với file này.'
        return $false
    }

    Write-Step 'Đang mở Vòng Quay May Mắn...'
    Start-Process -FilePath $appExe -WorkingDirectory $root | Out-Null
    return $true
}

# ------------------------------------------------------------------ chạy -----

Write-Title 'VÒNG QUAY MAY MẮN - KHỞI ĐỘNG'

$win = Get-WindowsInfo
Write-Host "  Hệ điều hành : $($win.Name) (build $($win.Build))"

$wv2 = Get-WebView2Version
if ($wv2) {
    Write-Ok "WebView2 đã có sẵn (phiên bản $wv2)."
} else {
    Write-Warn 'Máy này CHƯA có Microsoft Edge WebView2.'
}

# Máy đã có WebView2 -> mở ứng dụng luôn.
if ($wv2 -and -not $Force) {
    if ($NoLaunch) {
        Write-Host ''
        Write-Ok 'Máy đã sẵn sàng chạy ứng dụng (chế độ chỉ kiểm tra).'
        exit 0
    }
    if (Start-App) { exit 0 }
    exit 1
}

if (-not $win.IsWin10OrOlder) {
    Write-Host ''
    Write-Warn 'Windows 11 thường đã có sẵn WebView2. Nếu ứng dụng vẫn không mở được,'
    Write-Host '      hãy thử file "Chay_Che_Do_Tuong_Thich.bat" (chế độ tương thích đồ hoạ).'
} else {
    Write-Host ''
    Write-Host '  Ứng dụng cần Microsoft Edge WebView2 để hiển thị giao diện.' -ForegroundColor White
    Write-Host '  Windows 10 đời cũ thường chưa có sẵn thành phần này.' -ForegroundColor White
}

Write-Host ''
Write-Host '  Bước tiếp theo: tải và cài WebView2 từ Microsoft (cần Internet).' -ForegroundColor White
$answer = Read-Host '  Đồng ý cài đặt ngay? (C/K)'
if ($answer -notmatch '^[cCkKyY]') {
    Write-Host ''
    Write-Warn 'Đã bỏ qua. Bạn có thể cài WebView2 thủ công từ:'
    Write-Host '      https://developer.microsoft.com/microsoft-edge/webview2/'
    exit 1
}

try {
    Install-WebView2
} catch {
    Write-Host ''
    Write-Err $_.Exception.Message
    Write-Host ''
    Write-Host '  Cách xử lý:' -ForegroundColor White
    Write-Host '   1. Kiểm tra kết nối Internet rồi chạy lại file này.'
    Write-Host '   2. Hoặc cài WebView2 thủ công từ:'
    Write-Host '      https://developer.microsoft.com/microsoft-edge/webview2/'
    Write-Host '      (chọn "Evergreen Standalone Installer" để cài được trên máy không có Internet)'
    exit 1
}

$wv2After = Get-WebView2Version
if (-not $wv2After) {
    Write-Host ''
    Write-Err 'Đã cài đặt nhưng chưa đọc được thông tin WebView2. Hãy khởi động lại máy rồi thử lại.'
    exit 1
}

Write-Ok "WebView2 sẵn sàng (phiên bản $wv2After)."
Write-Host ''

if ($NoLaunch) {
    Write-Ok 'Cài đặt hoàn tất (chế độ chỉ kiểm tra).'
    exit 0
}

if (Start-App) {
    Write-Host ''
    Write-Ok 'Xong! Cửa sổ ứng dụng sẽ hiện ra trong giây lát.'
    Start-Sleep -Seconds 2
    exit 0
}
exit 1
