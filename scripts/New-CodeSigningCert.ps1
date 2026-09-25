<#
.SYNOPSIS
    Creates a self-signed code-signing certificate for local / school-org use.

.DESCRIPTION
    IMPORTANT - read this before relying on it for distribution:

      A self-signed certificate does NOT satisfy Windows SmartScreen on other
      people's PCs. It only removes "Unknown publisher" / SmartScreen warnings on
      machines where this certificate has been added to
      Trusted Root Certification Authorities + Trusted Publishers.

      That is genuinely useful when you control the target machines (a school's
      own computer lab, a USB stick you hand out, an internal rollout). It is not
      a substitute for a CA-issued OV/EV certificate when you distribute to the
      public - see packaging/HUONG_DAN_KY_UNGDUNG.md.

      Also note: signing does NOT remove the "downloaded from the Internet"
      Mark-of-the-Web. Recipients still need to unblock the file (or you can use
      packaging/Go_Chan_Bao_Mat_Cua_Windows.bat).

.EXAMPLE
    # Create a cert and trust it on THIS machine (adds to Root + TrustedPublisher)
    .\scripts\New-CodeSigningCert.ps1 -Trust

.EXAMPLE
    # Create a cert, then trust it on a target machine by importing the .cer
    .\scripts\New-CodeSigningCert.ps1
    Import-Certificate -FilePath .\certs\VongQuayMayMan-CodeSigning.cer -CertStoreLocation Cert:\LocalMachine\Root
    Import-Certificate -FilePath .\certs\VongQuayMayMan-CodeSigning.cer -CertStoreLocation Cert:\LocalMachine\TrustedPublisher
#>

[CmdletBinding()]
param(
    [string]$Subject = 'CN=Vong Quay May Man, O=HongDucDev, C=VN',

    # Where the exported .pfx / .cer are written. Kept out of the repo by .gitignore.
    [string]$OutDir,

    # Password for the exported PFX. Required for -PfxPath based signing later.
    [string]$Password = 'vongquaymayman',

    [int]$Years = 5,

    # Add the certificate to CurrentUser Root + TrustedPublisher so that
    # signatures made with it validate on THIS machine.
    [switch]$Trust,

    # Use the machine store instead of the user store (requires an elevated shell).
    [switch]$Machine
)

Set-StrictMode -Version Latest

$ErrorActionPreference = 'Stop'

if (-not $OutDir) {
    $OutDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'certs'
}

if (-not (Test-Path -LiteralPath $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$storeLocation = 'Cert:\CurrentUser\My'
if ($Machine) { $storeLocation = 'Cert:\LocalMachine\My' }

Write-Host "Creating self-signed code-signing certificate..."
Write-Host "  Subject : $Subject"
Write-Host "  Valid   : $Years year(s)"
Write-Host "  Store   : $storeLocation"

$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $Subject `
    -CertStoreLocation $storeLocation `
    -KeyAlgorithm RSA `
    -KeyLength 3072 `
    -HashAlgorithm SHA256 `
    -KeyUsage DigitalSignature `
    -NotAfter (Get-Date).AddYears($Years)

Write-Host "  Thumbprint: $($cert.Thumbprint)"

$pfxPath = Join-Path $OutDir 'VongQuayMayMan-CodeSigning.pfx'
$cerPath = Join-Path $OutDir 'VongQuayMayMan-CodeSigning.cer'
$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

# The PFX holds a private key - keep it readable only by the current user.
try {
    $acl = Get-Acl -LiteralPath $pfxPath
    $acl.SetAccessRuleProtection($true, $false)
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        $env:USERNAME, 'FullControl', 'Allow')))
    Set-Acl -LiteralPath $pfxPath -AclObject $acl
} catch {
    Write-Warning "Could not tighten permissions on $pfxPath : $($_.Exception.Message)"
}

if ($Trust) {
    Write-Host "Trusting the certificate on this machine (a Windows confirmation dialog may appear)..."
    foreach ($store in @('Root', 'TrustedPublisher')) {
        try {
            $svc = if ($Machine) { 'Cert:\LocalMachine\' + $store } else { 'Cert:\CurrentUser\' + $store }
            Import-Certificate -FilePath $cerPath -CertStoreLocation $svc | Out-Null
            Write-Host "  Added to $svc"
        } catch {
            Write-Warning "  Could not add to $store : $($_.Exception.Message)"
        }
    }
}

Write-Host ''
Write-Host 'Done.'
Write-Host "  PFX (private key, keep secret): $pfxPath"
Write-Host "  CER (public, safe to share)    : $cerPath"
Write-Host ''
Write-Host 'Use it for a signed build with either of:'
Write-Host "  .\scripts\Build-Windows.ps1 -Thumbprint $($cert.Thumbprint)"
Write-Host "  .\scripts\Build-Windows.ps1 -PfxPath `"$pfxPath`" -PfxPassword `"$Password`""
Write-Host ''
Write-Host 'To sign the installer on OTHER machines, trust the .cer there first:'
Write-Host "  Import-Certificate -FilePath `"$cerPath`" -CertStoreLocation Cert:\LocalMachine\Root"
Write-Host "  Import-Certificate -FilePath `"$cerPath`" -CertStoreLocation Cert:\LocalMachine\TrustedPublisher"
