<#
.SYNOPSIS
    Signs one or more Windows binaries with Authenticode (SHA-256 + RFC 3161 timestamp).

.DESCRIPTION
    Certificate selection, in order of preference:

      1. -Thumbprint   SHA-1 thumbprint of a certificate in the certificate store.
                       This is the PREFERRED path: modern OV/EV code-signing
                       certificates are usually issued with non-exportable keys
                       held in a TPM / HSM, so there is no PFX to point at.
      2. -PfxPath      A password-protected .pfx file (plus -PfxPassword or the
                       VONGQUAY_CERT_PASSWORD environment variable).
      3. -SubjectName  Subject-name substring match against the store.

    Credentials may also come from the environment so that CI does not need them
    on the command line:
      VONGQUAY_CERT_THUMBPRINT, VONGQUAY_CERT_PFX, VONGQUAY_CERT_PASSWORD,
      VONGQUAY_TIMESTAMP_URL

.EXAMPLE
    .\scripts\Sign-WindowsBinary.ps1 -Path .\dist-windows\VongQuayMayMan.exe -Thumbprint ABC123...
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string[]]$Path,

    [string]$Thumbprint = $env:VONGQUAY_CERT_THUMBPRINT,

    [string]$PfxPath = $env:VONGQUAY_CERT_PFX,

    # signtool requires the password in plain text, so it cannot be a SecureString here.
    [string]$PfxPassword = $env:VONGQUAY_CERT_PASSWORD,

    [string]$SubjectName,

    [string]$TimestampUrl = $(if ($env:VONGQUAY_TIMESTAMP_URL) { $env:VONGQUAY_TIMESTAMP_URL } else { 'http://timestamp.digicert.com' }),

    [string]$Description = 'Vong Quay May Man - Quay Thuong Lop Hoc',

    # Skip the timestamp step (not recommended: unsigned timestamps expire with the cert).
    [switch]$NoTimestamp
)

Set-StrictMode -Version Latest

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib\SignTool.ps1')

function Get-AuthenticodeReport {
    param([Parameter(Mandatory = $true)][string]$FilePath)

    $sig = Get-AuthenticodeSignature -LiteralPath $FilePath
    return [pscustomobject]@{
        Path      = $FilePath
        HasSigned = ($null -ne $sig.SignerCertificate)
        Status    = [string]$sig.Status
        Subject   = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { '' }
        Thumbprint = if ($sig.SignerCertificate) { $sig.SignerCertificate.Thumbprint } else { '' }
    }
}

# --- Validate inputs ---------------------------------------------------------

if (-not $Thumbprint -and -not $PfxPath -and -not $SubjectName) {
    throw @"
No code-signing certificate was provided.

Choose one of:
  -Thumbprint <sha1>                      (preferred; works with non-exportable keys)
  -PfxPath <file.pfx> -PfxPassword <pw>   (exportable certificate)
  -SubjectName <substring>

To create a self-signed certificate for testing or an internal rollout:
  .\scripts\New-CodeSigningCert.ps1 -Trust
"@
}

if ($PfxPath -and -not (Test-Path -LiteralPath $PfxPath)) {
    throw "PFX file not found: $PfxPath"
}

if ($PfxPath -and -not $PfxPassword) {
    throw 'A -PfxPassword (or VONGQUAY_CERT_PASSWORD) is required when using -PfxPath.'
}

$files = @()
foreach ($p in $Path) {
    $full = [System.IO.Path]::GetFullPath($p)
    if (-not (Test-Path -LiteralPath $full)) {
        throw "File to sign not found: $full"
    }
    $files += $full
}

$signtool = Get-SignToolOrInstall
Write-Host "signtool: $signtool"

$certArgs = @()
if ($Thumbprint) {
    $normalized = ($Thumbprint -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
    $certArgs = @('/sha1', $normalized)
    Write-Host "Certificate: thumbprint $normalized"
} elseif ($PfxPath) {
    $certArgs = @('/f', $PfxPath, '/p', $PfxPassword)
    Write-Host "Certificate: PFX $PfxPath"
} else {
    $certArgs = @('/n', $SubjectName, '/a')
    Write-Host "Certificate: subject match '$SubjectName'"
}

$commonArgs = @('sign', '/fd', 'sha256', '/d', $Description)
if (-not $NoTimestamp) {
    # RFC 3161 timestamping keeps signatures verifiable after the certificate expires.
    $commonArgs += @('/tr', $TimestampUrl, '/td', 'sha256')
} else {
    Write-Warning 'Signing without a timestamp - the signature will expire with the certificate.'
}

$failures = @()

foreach ($file in $files) {
    $name = Split-Path $file -Leaf
    Write-Host "Signing $name ..."

    $signArgs = $commonArgs + $certArgs + @($file)
    & $signtool @signArgs 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "signtool failed for $name (exit code $LASTEXITCODE)." -ErrorAction Continue
        $failures += $file
        continue
    }

    $report = Get-AuthenticodeReport -FilePath $file
    if (-not $report.HasSigned) {
        Write-Error "$name has no signature after signing." -ErrorAction Continue
        $failures += $file
        continue
    }

    # NOTE: for a self-signed certificate the Status will read as
    # 'UnknownError' / 'UntrustedRoot' on machines that do not trust it. That is
    # expected and is NOT a signing failure - the signature is present and will
    # validate wherever the certificate is trusted.
    if ($report.Status -eq 'Valid') {
        Write-Host "  OK - signature valid ($($report.Thumbprint))"
    } else {
        Write-Host "  OK - signature present; trust status on this machine: $($report.Status)"
        Write-Host "       (expected for a self-signed certificate that is not trusted here)"
    }
}

if ($failures.Count -gt 0) {
    throw "Signing failed for: $($failures -join ', ')"
}

Write-Host 'All files signed.'
