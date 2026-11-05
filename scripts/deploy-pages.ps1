$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
npm run build
New-Item -ItemType File -Path (Join-Path $root 'dist\.nojekyll') -Force | Out-Null

Push-Location (Join-Path $root 'dist')
$env:GIT_DIR = (Join-Path $root '.git')
$env:GIT_INDEX_FILE = Join-Path $env:TEMP 'dope-wars-pages-index'
Remove-Item -LiteralPath $env:GIT_INDEX_FILE -ErrorAction SilentlyContinue

git add -Af
$tree = git write-tree
$commit = git commit-tree $tree -m 'Deploy site to GitHub Pages'
Remove-Item Env:\GIT_INDEX_FILE
Remove-Item Env:\GIT_DIR
Pop-Location

git push --force origin "${commit}:refs/heads/gh-pages"
if ($LASTEXITCODE -ne 0) { throw 'Deploy push failed' }
Write-Output 'Deployed: https://trustnovirtue.github.io/dope-wars/'
