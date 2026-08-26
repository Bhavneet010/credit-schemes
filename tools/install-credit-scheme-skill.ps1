param(
    [string]$SourcePath = (Join-Path (Split-Path -Parent $PSScriptRoot) "skills\credit-scheme-research"),
    [string]$DestinationRoot = (Join-Path $env:USERPROFILE ".codex\skills"),
    [switch]$ReplaceMatchingSource
)

$ErrorActionPreference = "Stop"
$source = (Resolve-Path -LiteralPath $SourcePath).Path
$destinationRootFull = [System.IO.Path]::GetFullPath($DestinationRoot)
$destination = [System.IO.Path]::GetFullPath((Join-Path $destinationRootFull "credit-scheme-research"))
$bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$python = if (Test-Path -LiteralPath $bundledPython) { $bundledPython } else { "python" }
$env:PYTHONUTF8 = "1"
$expectedPrefix = $destinationRootFull.TrimEnd('\') + '\'
if (-not $destination.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe destination: $destination"
}

$skillFile = Join-Path $source "SKILL.md"
if (-not (Test-Path -LiteralPath $skillFile) -or -not (Select-String -LiteralPath $skillFile -Quiet -Pattern '^name: credit-scheme-research$')) {
    throw "Source is not the credit-scheme-research skill: $source"
}

function Get-ContentMap([string]$root, [switch]$IgnoreMarker) {
    $map = @{}
    Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($root.Length).TrimStart('\')
        if (-not ($IgnoreMarker -and $relative -eq ".credit-scheme-source.json")) {
            $map[$relative] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        }
    }
    return $map
}

function Test-MapsEqual($left, $right) {
    if ($left.Count -ne $right.Count) { return $false }
    foreach ($key in $left.Keys) {
        if (-not $right.ContainsKey($key) -or $left[$key] -ne $right[$key]) { return $false }
    }
    return $true
}

New-Item -ItemType Directory -Force -Path $destinationRootFull | Out-Null
if (Test-Path -LiteralPath $destination) {
    if (Test-MapsEqual (Get-ContentMap $source) (Get-ContentMap $destination -IgnoreMarker)) {
        Write-Output "Skill already installed and current: $destination"
        exit 0
    }
    $marker = Join-Path $destination ".credit-scheme-source.json"
    if (-not $ReplaceMatchingSource -or -not (Test-Path -LiteralPath $marker)) {
        throw "Refusing to overwrite a different existing skill at $destination"
    }
    $markerData = Get-Content -Raw -LiteralPath $marker | ConvertFrom-Json
    if ([System.IO.Path]::GetFullPath($markerData.source) -ne $source) {
        throw "Existing skill was installed from a different source."
    }
}

$stage = Join-Path $destinationRootFull (".credit-scheme-research-stage-" + [guid]::NewGuid().ToString('N'))
$backup = $null
try {
    New-Item -ItemType Directory -Path $stage | Out-Null
    Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $stage -Recurse -Force
    @{ source = $source } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage ".credit-scheme-source.json") -Encoding UTF8

    $validator = Join-Path $env:USERPROFILE ".codex\skills\.system\skill-creator\scripts\quick_validate.py"
    if (Test-Path -LiteralPath $validator) {
        & $python $validator $stage
        if ($LASTEXITCODE -ne 0) { throw "Skill validation failed." }
    }

    if (Test-Path -LiteralPath $destination) {
        $backup = Join-Path $destinationRootFull (".credit-scheme-research-backup-" + [guid]::NewGuid().ToString('N'))
        Move-Item -LiteralPath $destination -Destination $backup
    }
    Move-Item -LiteralPath $stage -Destination $destination
    if ($backup -and (Test-Path -LiteralPath $backup)) { Remove-Item -LiteralPath $backup -Recurse -Force }
    Write-Output "Installed credit-scheme-research: $destination"
} catch {
    if ((Test-Path -LiteralPath $stage) -and $stage.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
    if ($backup -and (Test-Path -LiteralPath $backup) -and -not (Test-Path -LiteralPath $destination)) {
        Move-Item -LiteralPath $backup -Destination $destination
    }
    throw
}
