$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$workflowRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$node = Join-Path $repoRoot '.tools/node-v26.8.2-win-x64/node.exe'
$vite = Join-Path $workflowRoot 'node_modules/vite/bin/vite.js'

if (-not (Test-Path -LiteralPath $node)) {
    throw 'Repository-local Node v26.8.2 is missing. Follow apps/workflow-ui/README.hyper-studio.md.'
}
if (-not (Test-Path -LiteralPath $vite)) {
    throw 'Workflow UI dependencies are missing. Follow apps/workflow-ui/README.hyper-studio.md.'
}

$env:PATH = (Split-Path -Parent $node) + [IO.Path]::PathSeparator + $env:PATH
$env:FRONTEND_COMMIT_HASH = '3ac95778a0be903c9c9ed7682c811ecd6da02f0e'
$env:VITE_HYPER_STUDIO_EMBEDDED = 'true'
$env:DISTRIBUTION = 'localhost'
$env:SENTRY_DSN = ''

Push-Location $workflowRoot
try {
    & (Join-Path $repoRoot 'scripts/with-local-env.ps1') $node $vite build --config vite.config.mts
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
