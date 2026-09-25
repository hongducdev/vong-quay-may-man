<#
.SYNOPSIS
    Builds, optionally signs, and assembles the Windows release into dist-windows/.

.DESCRIPTION
    One command from source to a shippable folder:

      1. Provisions signtool.exe (no Windows SDK required)
      2. Type-checks the frontend (tsc -b) and builds it (vite)
      3. Builds the Tauri app + NSIS installer, asking Tauri to sign the app
         binary AND the installer while it bundles
      4. Verifies that signatures are actually present on both artifacts
      5. Copies everything plus the end-user helper scripts into dist-windows/

    Certificates are NEVER written into src-tauri/tauri.conf.json. When signing
    is requested, a temporary Tauri config override is merged in for the build
    and deleted afterwards. Prefer -Thumbprint: modern OV/EV certificates are
    issued with non-exportable keys, so there is usually no PFX at all, and a
    thumbprint keeps no secret on disk.

.EXAMPLE
    # Unsigned build (Windows will warn on other people's PCs)
    .\scripts\Build-Windows.ps1

.EXAMPLE
    # Signed build with a certificate already in the store
    .\scripts\Build-Windows.ps1 -Thumbprint 576BCF818F68D36C4D814DAE448038D41C8A9993

.EXAMPLE
    # Fully offline installer for Windows 10 machines with no Internet and no WebView2
    .\scripts\Build-Windows.ps1 -OfflineWebView2 -Thumbprint $thumb
#>

[CmdletBinding()]
param(
    # SHA-1 thumbprint of a certificate in the certificate store.
    [string]$Thumbprint = $env:VONGQUAY_CERT_THUMBPRINT,

    # Alternatively point at a PFX; it is imported into the user store for the
    # build and removed afterwards.
    [string]$PfxPath = $env:VONGQUAY_CERT_PFX,

    [string]$PfxPassword = $env:VONGQUAY_CERT_PASSWORD,

    [string]$TimestampUrl = $(if ($env:VONGQUAY_TIMESTAMP_URL) { $env:VONGQUAY_TIMESTAMP_URL } else { 'http://timestamp.digicert.com' }),

    # Bundle the full WebView2 runtime (~150 MB installer) instead of the small
    # bootstrapper. Use this when the target Windows 10 machine has NO Internet
    # access - the default mode downloads the runtime from Microsoft.
    [switch]$OfflineWebView2,

    # Build without signing even if a certificate is configured.
    [switch]$SkipSign,

    # Also output a standalone portable .exe in addition to the setup file.
    [switch]$IncludePortable,

    # Keep the intermediate artifacts of a previous build (skips `tauri build`).
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path $PSScriptRoot -Parent
$tauriDir = Join-Path $repoRoot 'src-tauri'
$distDir = Join-Path $repoRoot 'dist-windows'
$packagingDir = Join-Path $repoRoot 'packaging'

. (Join-Path $PSScriptRoot 'lib\SignTool.ps1')

$tempConfig = $null
$importedCert = $null

function Get-NativeExitCode {
    <#
        $LASTEXITCODE only exists once a native command has actually run. Under
        Set-StrictMode reading it before that throws, so resolve it defensively.
    #>
    $v = Get-Variable -Name 'LASTEXITCODE' -ValueOnly -ErrorAction SilentlyContinue
    if ($null -eq $v) { return 0 }
    return [int]$v
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )
    Write-Host ''
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    # Reset so a pure-PowerShell step cannot be judged by a stale exit code.
    $global:LASTEXITCODE = 0
    & $Action
    $code = Get-NativeExitCode
    if ($code -ne 0) {
        throw "$Name failed with exit code $code."
    }
}

function Resolve-AppBinary {
    <#
        Tauri names the built executable after the Cargo package name, while the
        installer and the product use `productName`. Rather than hard-coding one
        of them, resolve from both sources and fall back to the newest exe.
    #>
    $releaseDir = Join-Path $tauriDir 'target\release'
    if (-not (Test-Path -LiteralPath $releaseDir)) {
        throw "Release directory not found: $releaseDir (has the project been built?)"
    }

    $names = @()

    $cargoToml = Join-Path $tauriDir 'Cargo.toml'
    if (Test-Path -LiteralPath $cargoToml) {
        $m = [regex]::Match((Get-Content -LiteralPath $cargoToml -Raw), '(?m)^\s*name\s*=\s*"([^"]+)"')
        if ($m.Success) { $names += $m.Groups[1].Value }
    }

    $confPath = Join-Path $tauriDir 'tauri.conf.json'
    if (Test-Path -LiteralPath $confPath) {
        $conf = Get-Content -LiteralPath $confPath -Raw | ConvertFrom-Json
        if ($conf.productName) { $names += [string]$conf.productName }
    }

    foreach ($name in $names) {
        $candidate = Join-Path $releaseDir "$name.exe"
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }

    $fallback = Get-ChildItem -LiteralPath $releaseDir -Filter '*.exe' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '^(build|nsis|wix|.*-setup)' } |
        Sort-Object -Property LastWriteTime -Descending |
        Select-Object -First 1
    if ($fallback) { return $fallback.FullName }

    throw "Could not locate the built application binary in $releaseDir."
}

function Get-SignatureReport {
    param([Parameter(Mandatory = $true)][string]$FilePath)

    $sig = Get-AuthenticodeSignature -LiteralPath $FilePath
    return [pscustomobject]@{
        File       = Split-Path $FilePath -Leaf
        FullPath   = $FilePath
        Signed     = ($null -ne $sig.SignerCertificate)
        Status     = [string]$sig.Status
        Subject    = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { '-' }
        Timestamp  = if ($sig.TimeStamperCertificate) { 'yes' } else { 'no' }
    }
}

try {
    # ---------------------------------------------------------------- signing --
    $signEnabled = $false

    if (-not $SkipSign) {
        if ($PfxPath) {
            if (-not (Test-Path -LiteralPath $PfxPath)) {
                throw "PFX not found: $PfxPath"
            }
            if (-not $PfxPassword) {
                throw 'A -PfxPassword (or VONGQUAY_CERT_PASSWORD) is required with -PfxPath.'
            }

            Write-Host "Importing certificate from $PfxPath ..."
            $secure = ConvertTo-SecureString -String $PfxPassword -Force -AsPlainText
            $importedCert = Import-PfxCertificate -FilePath $PfxPath -CertStoreLocation 'Cert:\CurrentUser\My' -Password $secure
            $Thumbprint = $importedCert.Thumbprint
            Write-Host "  Imported, thumbprint $Thumbprint"
        }

        if ($Thumbprint) {
            $normalized = ($Thumbprint -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
            $cert = Get-ChildItem 'Cert:\CurrentUser\My' -ErrorAction SilentlyContinue |
                Where-Object { $_.Thumbprint -eq $normalized } |
                Select-Object -First 1
            if (-not $cert) {
                throw "No certificate with thumbprint $normalized found in Cert:\CurrentUser\My."
            }
            if (-not $cert.HasPrivateKey) {
                throw "The certificate $normalized has no accessible private key, so it cannot be used for signing."
            }
            $Thumbprint = $normalized
            $signEnabled = $true
            Write-Host "Signing enabled: $($cert.Subject) (expires $($cert.NotAfter.ToString('yyyy-MM-dd')))"
        }
    }

    if (-not $signEnabled) {
        Write-Warning 'Building WITHOUT code signing.'
        Write-Warning 'Windows SmartScreen will warn users about this download and the UAC prompt will say "Unknown publisher".'
        Write-Warning 'Create a certificate with .\scripts\New-CodeSigningCert.ps1 (internal use) or use a CA-issued OV/EV certificate (public release).'
    }

    # ------------------------------------------------------------- toolchain --
    if ($signEnabled) {
        Invoke-Step -Name 'Provision signtool' -Action {
            $signtool = Get-SignToolOrInstall
            # Tauri invokes signtool.exe by name for its own signing step.
            $signtoolDir = Split-Path $signtool -Parent
            $env:PATH = "$signtoolDir;$env:PATH"
            Write-Host "signtool: $signtool"
        }
    }

    # ---------------------------------------------------------------- config --
    $overrides = @{ bundle = @{ windows = @{} } }

    # Load updater private key if available
    $updaterKeyPath = Join-Path $repoRoot 'certs\updater.key'
    if (Test-Path -LiteralPath $updaterKeyPath) {
        $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -LiteralPath $updaterKeyPath -Raw).Trim()
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "vongquaymayman"
        Write-Host "Updater signing key configured from $updaterKeyPath"
    } elseif ($env:TAURI_SIGNING_PRIVATE_KEY) {
        if ($null -eq $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
            $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
        }
        Write-Host "Updater signing key loaded from environment"
    } else {
        # If no updater key is configured, disable createUpdaterArtifacts so build succeeds
        $overrides.bundle.createUpdaterArtifacts = $false
    }

    if ($signEnabled) {
        $overrides.bundle.windows.certificateThumbprint = $Thumbprint
        $overrides.bundle.windows.digestAlgorithm = 'sha256'
        $overrides.bundle.windows.timestampUrl = $TimestampUrl
        $overrides.bundle.windows.tsp = $true
    }

    if ($OfflineWebView2) {
        $overrides.bundle.windows.webviewInstallMode = @{ type = 'offlineInstaller'; silent = $true }
        Write-Host 'WebView2: bundling the full offline runtime (~150 MB installer).'
    }

    $hasOverrides = ($signEnabled -or $OfflineWebView2)
    if ($hasOverrides) {
        $tempConfig = Join-Path ([System.IO.Path]::GetTempPath()) ("vqmm-tauri-config-" + [System.Guid]::NewGuid().ToString('N') + '.json')
        $overrides | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $tempConfig -Encoding UTF8
        Write-Host "Temporary Tauri config override: $tempConfig"
    }

    # ----------------------------------------------------------------- build --
    if (-not $SkipBuild) {
        Invoke-Step -Name 'Type-check + build frontend (npm run build)' -Action {
            Push-Location $repoRoot
            try { npm run build } finally { Pop-Location }
        }

        $tauriArgs = @('run', 'tauri', 'build')
        if ($tempConfig) {
            $tauriArgs += @('--', '--config', $tempConfig)
        }

        Invoke-Step -Name 'Build Tauri app + NSIS installer' -Action {
            Push-Location $repoRoot
            try {
                if ($tempConfig) {
                    npm @tauriArgs
                } else {
                    npm run tauri build
                }
            } finally { Pop-Location }
        }
    }

    # ------------------------------------------------------------ artifacts --
    Invoke-Step -Name 'Collect artifacts' -Action {
        $appExe = Resolve-AppBinary

        $nsisDir = Join-Path $tauriDir 'target\release\bundle\nsis'
        $setupExe = $null
        if (Test-Path -LiteralPath $nsisDir) {
            $setupExe = Get-ChildItem -LiteralPath $nsisDir -Filter '*-setup.exe' -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
        }

        Write-Host "  App binary : $appExe"
        if ($setupExe) { Write-Host "  Installer  : $($setupExe.FullName)" }

        # --- verify signatures before shipping -------------------------------
        Write-Host ''
        Write-Host 'Signature check:'
        $reports = @(Get-SignatureReport -FilePath $appExe)
        if ($setupExe) { $reports += Get-SignatureReport -FilePath $setupExe.FullName }
        $reports | Format-Table File, Signed, Status, Subject, Timestamp -AutoSize | Out-String | Write-Host

        if ($signEnabled) {
            # IMPORTANT: Tauri signs the copy of the app binary that it embeds in
            # the installer, then restores the UNSIGNED binary in target/release.
            # That leftover file is exactly what becomes the portable exe, and it
            # is NOT covered by Tauri's own signing - so sign it here.
            # (Verified: extracting a silent install shows the installed app and
            # the uninstaller are both validly signed by Tauri.)
            $unsigned = @($reports | Where-Object { -not $_.Signed })
            if ($unsigned.Count -gt 0) {
                Write-Host "Signing $(($unsigned | ForEach-Object { $_.File }) -join ', ') (not covered by Tauri's bundler)..."
                $toSign = @($unsigned | ForEach-Object { $_.FullPath })
                & (Join-Path $PSScriptRoot 'Sign-WindowsBinary.ps1') -Path $toSign -Thumbprint $Thumbprint -TimestampUrl $TimestampUrl

                # Re-read so the manifest below reports the true end state.
                $reports = @($reports | ForEach-Object { Get-SignatureReport -FilePath $_.FullPath })
            }

            $stillUnsigned = @($reports | Where-Object { -not $_.Signed })
            if ($stillUnsigned.Count -gt 0) {
                throw "Could not sign: $(($stillUnsigned | ForEach-Object { $_.File }) -join ', ')"
            }

            Write-Host 'All shipped artifacts are signed.' -ForegroundColor Green
            foreach ($r in $reports) {
                if ($r.Status -ne 'Valid') {
                    Write-Host "  $($r.File): signature present, but trust status on THIS machine is '$($r.Status)'." -ForegroundColor Yellow
                    Write-Host '    This is expected for a self-signed certificate that is not trusted here.'
                }
            }
        }

        # --- assemble dist-windows (chỉ 1 file cài đặt duy nhất) -------------
        if (Test-Path -LiteralPath $distDir) {
            Get-ChildItem -LiteralPath $distDir -Force | Remove-Item -Recurse -Force
        } else {
            New-Item -ItemType Directory -Path $distDir -Force | Out-Null
        }

        if (-not $setupExe) {
            throw "Không tìm thấy file cài đặt setup.exe trong $nsisDir"
        }

        $finalInstallerPath = Join-Path $distDir 'VongQuayMayMan_Setup.exe'
        Copy-Item -LiteralPath $setupExe.FullName -Destination $finalInstallerPath -Force

        # Tùy chọn: nếu người dùng yêu cầu kèm bản Portable độc lập (-IncludePortable)
        if ($IncludePortable) {
            Copy-Item -LiteralPath $appExe -Destination (Join-Path $distDir 'VongQuayMayMan_Portable.exe') -Force
        }

        Write-Host ''
        Write-Host "XONG! File cài đặt duy nhất đã sẵn sàng:" -ForegroundColor Green
        Get-ChildItem -LiteralPath $distDir | Select-Object Name, @{ n = 'MB'; e = { [math]::Round($_.Length / 1MB, 2) } }, LastWriteTime | Format-Table -AutoSize
    }
} finally {
    if ($tempConfig -and (Test-Path -LiteralPath $tempConfig)) {
        Remove-Item -LiteralPath $tempConfig -Force -ErrorAction SilentlyContinue
    }
    if ($importedCert) {
        Remove-Item -LiteralPath ("Cert:\CurrentUser\My\" + $importedCert.Thumbprint) -Force -ErrorAction SilentlyContinue
    }
}
