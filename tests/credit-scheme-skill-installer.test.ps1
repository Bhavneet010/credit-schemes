$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$installer = Join-Path $repo "tools\install-credit-scheme-skill.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("credit-scheme-installer-" + [guid]::NewGuid().ToString('N'))
$sourceRoot = Join-Path $tempRoot "source"
$destinationRoot = Join-Path $tempRoot "destination"

try {
    New-Item -ItemType Directory -Force -Path $sourceRoot,$destinationRoot | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $repo "skills\credit-scheme-research") -Force | Copy-Item -Destination $sourceRoot -Recurse -Force

    & $installer -SourcePath $sourceRoot -DestinationRoot $destinationRoot
    if ($LASTEXITCODE -ne 0) { throw "First install failed." }
    & $installer -SourcePath $sourceRoot -DestinationRoot $destinationRoot
    if ($LASTEXITCODE -ne 0) { throw "Idempotent install failed." }

    $installed = Join-Path $destinationRoot "credit-scheme-research"
    Remove-Item -LiteralPath $installed -Recurse -Force
    New-Item -ItemType Directory -Path $installed | Out-Null
    Set-Content -LiteralPath (Join-Path $installed "SKILL.md") -Value "---`nname: unrelated`ndescription: Use when unrelated.`n---"
    $refused = $false
    try { & $installer -SourcePath $sourceRoot -DestinationRoot $destinationRoot } catch { $refused = $true }
    if (-not $refused) { throw "Installer overwrote an unrelated destination." }
    if (-not (Select-String -LiteralPath (Join-Path $installed "SKILL.md") -Quiet -Pattern '^name: unrelated$')) {
        throw "Unrelated destination was modified."
    }
    Write-Output "Installer safety tests passed."
} finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($tempRoot)
    $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemp)) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
