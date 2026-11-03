# Upload _cpanel_deploy/release to Hostinger via FTP
# Required env: FTP_HOST, FTP_USER, FTP_PASS
# Optional: FTP_REMOTE_ROOT (default /public_html), FTP_SKIP_API=1, FTP_SKIP_FRONTEND=1
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Release = Join-Path $Root '_cpanel_deploy\release'
$HostName = $env:FTP_HOST
$User = $env:FTP_USER
$Pass = $env:FTP_PASS
$RemoteRoot = if ($env:FTP_REMOTE_ROOT) { $env:FTP_REMOTE_ROOT.TrimEnd('/') } else { '/public_html' }

if (-not $HostName -or -not $User -or -not $Pass) {
  throw 'Set FTP_HOST, FTP_USER, FTP_PASS environment variables first.'
}
if (-not (Test-Path $Release)) {
  throw "Release folder missing. Run .\deploy\build-hostinger.ps1 first."
}

function New-FtpRequest([string]$uri, [string]$method) {
  $req = [System.Net.FtpWebRequest]::Create($uri)
  $req.Credentials = New-Object System.Net.NetworkCredential($User, $Pass)
  $req.Method = $method
  $req.UseBinary = $true
  $req.UsePassive = $true
  $req.KeepAlive = $false
  $req.EnableSsl = $false
  return $req
}

function Ensure-FtpDir([string]$remoteDir) {
  $parts = $remoteDir.Trim('/').Split('/') | Where-Object { $_ }
  $path = ''
  foreach ($p in $parts) {
    $path = "$path/$p"
    try {
      $req = New-FtpRequest "ftp://${HostName}${path}" ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)
      $resp = $req.GetResponse()
      $resp.Close()
    } catch {
      # exists or not creatable — continue
    }
  }
}

function Upload-File([string]$localFile, [string]$remoteFile) {
  $remoteDir = Split-Path $remoteFile.Replace('\', '/') -Parent
  if ($remoteDir) { Ensure-FtpDir $remoteDir }
  $uri = "ftp://${HostName}$($remoteFile.Replace('\', '/'))"
  $req = New-FtpRequest $uri ([System.Net.WebRequestMethods+Ftp]::UploadFile)
  $bytes = [System.IO.File]::ReadAllBytes($localFile)
  $req.ContentLength = $bytes.Length
  $stream = $req.GetRequestStream()
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Close()
  $resp = $req.GetResponse()
  $resp.Close()
  Write-Host "  OK  $remoteFile"
}

function Upload-Tree([string]$localRoot, [string]$remoteRoot) {
  Get-ChildItem $localRoot -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($localRoot.Length).TrimStart('\', '/')
    $remote = "$remoteRoot/" + ($rel.Replace('\', '/'))
    Upload-File $_.FullName $remote
  }
}

Write-Host "FTP host: $HostName  user: $User  root: $RemoteRoot"

# Quick auth check
try {
  $list = New-FtpRequest "ftp://${HostName}${RemoteRoot}" ([System.Net.WebRequestMethods+Ftp]::ListDirectory)
  $r = $list.GetResponse(); $r.Close()
  Write-Host 'FTP login OK'
} catch {
  throw "FTP login/list failed for ${RemoteRoot}: $($_.Exception.Message)"
}

if ($env:FTP_SKIP_FRONTEND -ne '1') {
  Write-Host '==> Uploading frontend -> public_html/'
  Upload-Tree (Join-Path $Release 'frontend') $RemoteRoot
}

if ($env:FTP_SKIP_API -ne '1') {
  Write-Host '==> Uploading API -> public_html/api/'
  Upload-Tree (Join-Path $Release 'api') "$RemoteRoot/api"
}

Write-Host ''
Write-Host 'Upload finished.'
Write-Host 'Still required in hPanel:'
Write-Host '  1) Create/configure Node.js app (startup: app.js, URL: /api)'
Write-Host '  2) Create api/.env with MySQL credentials'
Write-Host '  3) SSH/terminal: npm install --omit=dev && npm run seed'
Write-Host '  4) Restart Node app'
Write-Host '  5) Check https://terranexusproperties.com/api/health'
