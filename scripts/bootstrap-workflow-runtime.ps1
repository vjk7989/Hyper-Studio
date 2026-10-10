param(
    [string] $SharedStorageRoot,
    [switch] $PrepareOnly
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $repoRoot
if (-not $SharedStorageRoot) {
    $SharedStorageRoot = Join-Path $repoRoot '.local-cache/shared-storage'
}
$resolved = [System.IO.Path]::GetFullPath($SharedStorageRoot)
$workspacePrefix = [System.IO.Path]::GetFullPath($workspaceRoot).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
if (-not $resolved.StartsWith($workspacePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Workflow storage must stay inside $workspaceRoot"
}
for ($cursor = $resolved; $cursor.StartsWith($workspacePrefix, [System.StringComparison]::OrdinalIgnoreCase); $cursor = Split-Path -Parent $cursor) {
    if ((Test-Path -LiteralPath $cursor) -and (Get-Item -LiteralPath $cursor).LinkType) {
        throw 'Workflow storage path must not contain a symbolic link or junction'
    }
}

$cacheRoot = Join-Path $repoRoot '.local-cache'
$tempRoot = Join-Path $repoRoot '.local-tmp'
$venv = Join-Path $resolved 'runtimes/workflow/.venv'
$python = if ([System.IO.Path]::DirectorySeparatorChar -eq '\') { Join-Path $venv 'Scripts/python.exe' } else { Join-Path $venv 'bin/python3' }
New-Item -ItemType Directory -Force -Path $resolved, $cacheRoot, $tempRoot | Out-Null
$env:UV_CACHE_DIR = Join-Path $cacheRoot 'uv'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $repoRoot '.tools/python'
$env:UV_NO_MANAGED_PYTHON = '1'
$env:TEMP = $tempRoot
$env:TMP = $tempRoot
$env:TMPDIR = $tempRoot

if (-not (Test-Path -LiteralPath $python)) {
    & uv venv --python 3.12 $venv
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the repository-local workflow environment' }
}
if (-not $PrepareOnly) {
    & uv pip install --python $python -r (Join-Path $repoRoot 'services/workflow/requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Workflow dependency installation failed' }
}
Write-Output "Workflow runtime: $python"
