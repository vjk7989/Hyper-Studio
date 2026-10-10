param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $Executable,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$cacheRoot = Join-Path $repoRoot '.local-cache'
$tempRoot = Join-Path $repoRoot '.local-tmp'

foreach ($path in @($cacheRoot, $tempRoot)) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
}

$env:npm_config_cache = Join-Path $cacheRoot 'npm'
$env:COREPACK_HOME = Join-Path $cacheRoot 'corepack'
$env:XDG_CACHE_HOME = $cacheRoot
$env:PNPM_HOME = Join-Path $repoRoot '.tools/pnpm'
$env:UV_CACHE_DIR = Join-Path $cacheRoot 'uv'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $repoRoot '.tools/python'
$env:PIP_CACHE_DIR = Join-Path $cacheRoot 'pip'
$env:HF_HOME = Join-Path $cacheRoot 'huggingface'
$env:TORCH_HOME = Join-Path $cacheRoot 'torch'
$env:ELECTRON_CACHE = Join-Path $cacheRoot 'electron'
$env:ELECTRON_BUILDER_CACHE = Join-Path $cacheRoot 'electron-builder'
$env:TEMP = $tempRoot
$env:TMP = $tempRoot
$env:TMPDIR = $tempRoot
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
$env:HYPER_STUDIO_USER_DATA = Join-Path $repoRoot '.local-cache/hyper-studio-user-data'

& $Executable @Arguments
exit $LASTEXITCODE
