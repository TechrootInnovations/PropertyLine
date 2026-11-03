# Full local build + FTP upload helper
# Usage:
#   $env:FTP_HOST='ftp.terranexusproperties.com'
#   $env:FTP_USER='...'
#   $env:FTP_PASS='...'
#   .\deploy\deploy-hostinger.ps1
$ErrorActionPreference = 'Stop'
& "$PSScriptRoot\build-hostinger.ps1"
& "$PSScriptRoot\upload-ftp.ps1"
