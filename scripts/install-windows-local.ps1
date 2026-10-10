param(
    [string] $Installer = 'apps/desktop/release/Hyper-Studio-Setup.exe',
    [string] $Destination = '.local-tmp/installed-hyper-studio'
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$installerPath = (Resolve-Path (Join-Path $repoRoot $Installer)).Path
$destinationPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Destination))
$tempRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot '.local-tmp'))
$repoPrefix = $repoRoot.TrimEnd('\') + '\'
$packagedCanvasAssets = Join-Path $repoRoot 'apps/desktop/release/win-unpacked/resources/workflow-frontend/assets'

if (-not $installerPath.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The installer must be inside the repository.'
}
if (-not $destinationPath.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The installation destination must be inside the repository.'
}
if (Test-Path -LiteralPath $destinationPath) {
    throw "Installation destination already exists: $destinationPath"
}
$canvasScripts = @(Get-ChildItem -LiteralPath $packagedCanvasAssets -Filter '*.js' -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
if ($canvasScripts.Count -eq 0 -or
    -not (Select-String -Path $canvasScripts -Pattern 'hyper-studio:request-workflow' -Quiet)) {
    throw 'Packaged workflow canvas is missing the Hyper-Studio bridge; rebuild it for desktop before installing.'
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
$env:TEMP = $tempRoot
$env:TMP = $tempRoot
$env:TMPDIR = $tempRoot

foreach ($name in @('TEMP', 'TMP', 'TMPDIR')) {
    $value = [System.IO.Path]::GetFullPath([Environment]::GetEnvironmentVariable($name, 'Process'))
    if (-not $value.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$name escaped the repository: $value"
    }
}

$process = Start-Process -FilePath $installerPath -ArgumentList @('/S', "/D=$destinationPath") -WindowStyle Hidden -PassThru -Wait
if ($process.ExitCode -ne 0) {
    throw "Installer exited with code $($process.ExitCode). Check available space and the repository-local temp folder."
}

$installedExe = Join-Path $destinationPath 'Hyper-Studio.exe'
$unpackedExe = Join-Path $repoRoot 'apps/desktop/release/win-unpacked/Hyper-Studio.exe'
if (-not (Test-Path -LiteralPath $installedExe)) {
    throw "Installed executable is missing: $installedExe"
}
if (Test-Path -LiteralPath $unpackedExe) {
    $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $unpackedExe).Hash
    $installedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $installedExe).Hash
    if ($sourceHash -ne $installedHash) {
        throw 'Installed executable differs from the unpacked executable. Installation may be incomplete.'
    }
}

Write-Output $installedExe
