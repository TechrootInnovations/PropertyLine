# Build Hostinger release package (frontend + API, no secrets)
$ErrorActionPreference = 'Stop'
$env:Path = "C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;" + $env:Path
$Root = Split-Path -Parent $PSScriptRoot
$Release = Join-Path $Root '_cpanel_deploy\release'
$Ui = Join-Path $Root 'property_listing_uiux'
$Api = Join-Path $Root 'property_listing_api'
$Deploy = Join-Path $Root '_cpanel_deploy'

Write-Host '==> Cleaning release folder'
if (Test-Path $Release) { Remove-Item $Release -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $Release 'frontend') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Release 'api') | Out-Null

Write-Host '==> Building React frontend'
Push-Location $Ui
if (-not (Test-Path 'node_modules')) { npm install }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Frontend build failed' }
Pop-Location

Write-Host '==> Copying frontend dist'
Copy-Item -Path (Join-Path $Ui 'dist\*') -Destination (Join-Path $Release 'frontend') -Recurse -Force
Copy-Item -Path (Join-Path $Deploy 'frontend.htaccess') -Destination (Join-Path $Release 'frontend\.htaccess') -Force

Write-Host '==> Copying API (excluding node_modules, .env, uploads content)'
$apiDest = Join-Path $Release 'api'
$excludeDirs = @('node_modules', '.git', 'uploads', 'import_catalog.php')
Get-ChildItem $Api -Force | Where-Object {
  $_.Name -notin $excludeDirs -and $_.Name -notmatch '^\.env($|\.)'
} | ForEach-Object {
  Copy-Item $_.FullName -Destination (Join-Path $apiDest $_.Name) -Recurse -Force
}

# Ensure empty uploads dir exists
New-Item -ItemType Directory -Path (Join-Path $apiDest 'uploads\properties') -Force | Out-Null
Copy-Item (Join-Path $Deploy 'app.js') -Destination (Join-Path $apiDest 'app.js') -Force
Copy-Item (Join-Path $Deploy 'api.htaccess') -Destination (Join-Path $apiDest '.htaccess') -Force
Copy-Item (Join-Path $Deploy '.env.production.example') -Destination (Join-Path $apiDest '.env.example') -Force

# One-time seed helper (delete on server after use)
$seedPhp = Join-Path $Ui 'seed_once.php'
if (Test-Path $seedPhp) {
  Copy-Item $seedPhp -Destination (Join-Path $apiDest 'seed_once.php') -Force
}

Write-Host ''
Write-Host "Release ready: $Release"
Write-Host '  frontend/  -> upload to public_html/'
Write-Host '  api/       -> upload to public_html/api/'
Write-Host 'Next: set FTP_* env vars and run .\deploy\upload-ftp.ps1'
