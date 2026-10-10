param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $OpenCodeArguments
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$base = Join-Path $repoRoot '.tools/opencode'
$exe = Join-Path $base 'bin/2.0.26/opencode.exe'
if (-not (Test-Path -LiteralPath $exe)) {
    throw "Repository-local OpenCode V2 binary is missing: $exe"
}

$paths = @{
    home = Join-Path $base 'home'
    config = Join-Path $base 'config'
    data = Join-Path $base 'data'
    state = Join-Path $base 'state'
    cache = Join-Path $base 'cache'
    temp = Join-Path $base 'temp'
    roaming = Join-Path $base 'roaming'
    local = Join-Path $base 'local'
    logs = Join-Path $base 'logs'
}
foreach ($path in $paths.Values) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
}

# Scope every home, XDG, Windows profile, and temporary path to this process.
$env:HOME = $paths.home
$env:USERPROFILE = $paths.home
$env:HOMEDRIVE = [System.IO.Path]::GetPathRoot($paths.home).TrimEnd('\')
$env:HOMEPATH = $paths.home.Substring($env:HOMEDRIVE.Length)
$env:APPDATA = $paths.roaming
$env:LOCALAPPDATA = $paths.local
$env:XDG_CONFIG_HOME = $paths.config
$env:XDG_DATA_HOME = $paths.data
$env:XDG_STATE_HOME = $paths.state
$env:XDG_CACHE_HOME = $paths.cache
$env:TEMP = $paths.temp
$env:TMP = $paths.temp
$env:TMPDIR = $paths.temp
$env:OPENCODE_DB = Join-Path $paths.data 'opencode.db'
$env:OPENCODE_CONFIG = Join-Path $paths.config 'opencode.json'
$env:OPENCODE_DISABLE_AUTOUPDATE = '1'
$env:npm_config_cache = Join-Path $paths.cache 'npm'

Set-Location -LiteralPath $repoRoot
& $exe @OpenCodeArguments
exit $LASTEXITCODE
