$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$workflowRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nodeDir = Join-Path $repoRoot '.tools/node-v26.8.2-win-x64'
$node = Join-Path $nodeDir 'node.exe'
$archive = Join-Path $repoRoot '.local-cache/node-v26.8.2-win-x64.zip'
$nodeHash = 'cf02f5d0c06c794b84f277177d5cf3743d0924ca49f6641cd435dd7cb6ee9085'
$pnpm = Join-Path $repoRoot '.tools/pnpm11/node_modules/pnpm/bin/pnpm.cjs'
$wrapper = Join-Path $repoRoot 'scripts/with-local-env.ps1'

if (-not (Test-Path -LiteralPath $node)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $archive) | Out-Null
    if (-not (Test-Path -LiteralPath $archive)) {
        Invoke-WebRequest 'https://nodejs.org/dist/v26.8.2/node-v26.8.2-win-x64.zip' -OutFile $archive
    }
    $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $nodeHash) { throw 'Node archive hash does not match the pinned release.' }
    Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $repoRoot '.tools') -Force
}

$env:PATH = $nodeDir + [IO.Path]::PathSeparator + $env:PATH
if (-not (Test-Path -LiteralPath $pnpm)) {
    $npm = Join-Path $nodeDir 'node_modules/npm/bin/npm-cli.js'
    & $wrapper $node $npm install --prefix (Join-Path $repoRoot '.tools/pnpm11') 'pnpm@11.13.1' --ignore-scripts
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Push-Location $workflowRoot
try {
    & $wrapper $node $pnpm install --frozen-lockfile --filter '@comfyorg/comfyui-frontend...'
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
