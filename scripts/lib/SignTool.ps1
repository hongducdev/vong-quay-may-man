<#
.SYNOPSIS
    Locates (and if necessary provisions) signtool.exe.

.DESCRIPTION
    Authenticode signing on Windows normally requires the Windows SDK. Rather
    than requiring a multi-gigabyte SDK install, this module falls back to
    downloading Microsoft's own `Microsoft.Windows.SDK.BuildTools` NuGet package
    and caching just signtool.exe under the user's profile.

    Search order:
      1. signtool.exe already on PATH
      2. Any installed Windows 10/11 SDK (x64)
      3. The local cache populated by Install-SignTool

    Dot-source this file to get the functions, or run it directly to provision.

.NOTES
    Windows PowerShell 5.1 compatible (no null-coalescing / ternary operators).
#>

Set-StrictMode -Version Latest

$script:SignToolPackageId = 'Microsoft.Windows.SDK.BuildTools'
$script:SignToolPackageVersion = '10.0.28000.2705'

function Get-SignToolCacheRoot {
    Join-Path $env:LOCALAPPDATA 'VongQuayMayMan\tools\signtool'
}

function Get-SignToolPath {
    [CmdletBinding()]
    param()

    # 1. Already on PATH
    $onPath = Get-Command 'signtool.exe' -ErrorAction SilentlyContinue
    if ($onPath) {
        return $onPath.Source
    }

    # 2. An installed Windows SDK
    $sdkRoots = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'),
        (Join-Path $env:ProgramFiles 'Windows Kits\10\bin')
    )
    foreach ($root in $sdkRoots) {
        if (-not $root -or -not (Test-Path -LiteralPath $root)) { continue }
        $candidate = Get-ChildItem -LiteralPath $root -Recurse -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '\\x64\\' } |
            Sort-Object -Property FullName -Descending |
            Select-Object -First 1
        if ($candidate) {
            return $candidate.FullName
        }
    }

    # 3. Our own cache
    $cached = Join-Path (Join-Path (Get-SignToolCacheRoot) $script:SignToolPackageVersion) 'signtool.exe'
    if (Test-Path -LiteralPath $cached) {
        return $cached
    }

    return $null
}

function Install-SignTool {
    <#
    .SYNOPSIS
        Downloads signtool.exe from Microsoft's NuGet feed into the local cache.
    #>
    [CmdletBinding()]
    param(
        [switch]$Force
    )

    $existing = Get-SignToolPath
    if ($existing -and -not $Force) {
        Write-Host "signtool already available: $existing"
        return $existing
    }

    $cacheDir = Join-Path (Get-SignToolCacheRoot) $script:SignToolPackageVersion
    $target = Join-Path $cacheDir 'signtool.exe'
    if ((Test-Path -LiteralPath $target) -and -not $Force) {
        return $target
    }

    Write-Host "Provisioning signtool.exe from NuGet ($script:SignToolPackageId $script:SignToolPackageVersion)..."

    # Windows PowerShell 5.1 defaults to TLS 1.0 for some hosts.
    try {
        $current = [Net.ServicePointManager]::SecurityProtocol
        if ($current -notmatch 'Tls12') {
            [Net.ServicePointManager]::SecurityProtocol = $current -bor [Net.SecurityProtocolType]::Tls12
        }
    } catch {
        # Ignore: newer runtimes ignore this setting entirely.
    }

    $url = "https://api.nuget.org/v3-flatcontainer/$($script:SignToolPackageId.ToLowerInvariant())/$script:SignToolPackageVersion/$($script:SignToolPackageId.ToLowerInvariant()).$script:SignToolPackageVersion.nupkg"

    $work = Join-Path ([System.IO.Path]::GetTempPath()) ("vqmm-sdkbt-" + [System.Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $work -Force | Out-Null

    try {
        # Expand-Archive refuses non-.zip extensions on PS 5.1, so rename first.
        $zipPath = Join-Path $work 'sdkbuildtools.zip'
        Write-Host "  Downloading $url"
        $progress = $ProgressPreference
        $ProgressPreference = 'SilentlyContinue'
        try {
            Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
        } finally {
            $ProgressPreference = $progress
        }

        $extract = Join-Path $work 'extract'
        Expand-Archive -LiteralPath $zipPath -DestinationPath $extract -Force

        $found = Get-ChildItem -LiteralPath $extract -Recurse -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '\\x64\\' } |
            Sort-Object -Property FullName -Descending |
            Select-Object -First 1

        if (-not $found) {
            throw "signtool.exe was not found inside the downloaded package."
        }

        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Copy-Item -LiteralPath $found.FullName -Destination $target -Force
        Write-Host "  Installed: $target"
        return $target
    } finally {
        Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Get-SignToolOrInstall {
    [CmdletBinding()]
    param()

    $path = Get-SignToolPath
    if ($path) { return $path }
    return Install-SignTool
}

# Allow direct invocation: `powershell -File scripts/lib/SignTool.ps1`
if ($MyInvocation.InvocationName -ne '.') {
    $resolved = Get-SignToolOrInstall
    Write-Host "signtool: $resolved"
    $resolved
}
