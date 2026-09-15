$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$pgData = Join-Path $workspace ".local-pg"
$nodeBin = "C:\Users\NMB\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$pnpmBin = "C:\Users\NMB\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback"
$newCluster = -not (Test-Path -LiteralPath (Join-Path $pgData "PG_VERSION"))

if ($newCluster) {
  & (Join-Path $pgBin "initdb.exe") -D $pgData --auth=trust --encoding=UTF8 --username=eri
}

& (Join-Path $pgBin "pg_ctl.exe") -D $pgData status *> $null
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $pgBin "pg_ctl.exe") -D $pgData -l (Join-Path $pgData "server.log") -o '"-p 55432 -h 127.0.0.1"' start
}

if ($newCluster) {
  & (Join-Path $pgBin "createdb.exe") -h 127.0.0.1 -p 55432 -U eri eri
}

$env:PATH = "$nodeBin;$pnpmBin;$env:PATH"
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://eri@127.0.0.1:55432/eri?schema=public"
$env:SESSION_DATABASE_URL = $env:DATABASE_URL
$env:SESSION_SECRET = "local-development-secret-change"
$env:API_PORT = "4000"
$env:WEB_ORIGIN = "http://localhost:5173"
$env:UPLOAD_DIR = Join-Path $workspace "uploads"
$env:MAX_UPLOAD_BYTES = "5242880"
$env:LOG_LEVEL = "info"

if ($newCluster) {
  & (Join-Path $pnpmBin "pnpm.cmd") --filter @eri/api exec prisma migrate deploy
  & (Join-Path $pnpmBin "pnpm.cmd") --filter @eri/api db:seed
}

Set-Location $workspace
& (Join-Path $pnpmBin "pnpm.cmd") dev
