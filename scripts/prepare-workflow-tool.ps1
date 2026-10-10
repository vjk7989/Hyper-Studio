$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$version = '0.9.26'
$expectedSha256 = 'eb02fd95d8e0eed462b4a67ecdd320d865b38c560bffcda9a0b87ec944bdf036'
$archiveUrl = "https://github.com/astral-sh/uv/releases/download/$version/uv-x86_64-pc-windows-msvc.zip"
$cacheDir = Join-Path $repoRoot '.local-cache/workflow-tools'
$archive = Join-Path $cacheDir "uv-$version-windows-x64.zip"
$extract = Join-Path $cacheDir "uv-$version-windows-x64"
$destinationDir = Join-Path $repoRoot '.tools/workflow'
$destination = Join-Path $destinationDir 'uv.exe'

New-Item -ItemType Directory -Force -Path $cacheDir, $destinationDir | Out-Null
if (-not (Test-Path -LiteralPath $archive)) {
    Invoke-WebRequest -Uri $archiveUrl -OutFile $archive -UseBasicParsing
}
$sha = [System.Security.Cryptography.SHA256]::Create()
$stream = [System.IO.File]::OpenRead($archive)
try {
    $actualSha256 = [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
} finally {
    $stream.Dispose()
    $sha.Dispose()
}
if ($actualSha256 -ne $expectedSha256) {
    throw 'Pinned uv archive checksum does not match the official release checksum'
}
Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force
$source = Join-Path $extract 'uv.exe'
if (-not (Test-Path -LiteralPath $source)) { throw 'Pinned uv archive does not contain uv.exe' }
Copy-Item -LiteralPath $source -Destination $destination -Force
$reported = & $destination --version
if ($LASTEXITCODE -ne 0 -or $reported -notmatch '^uv 0\.9\.26(?:\s|$)') { throw 'Pinned uv executable failed version verification' }
Write-Output "Prepared $destination"
