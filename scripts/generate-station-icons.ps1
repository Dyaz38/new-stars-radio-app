# Generate station logo variants (transparent header logo + square PWA icons)
$ErrorActionPreference = "Stop"
python (Join-Path $PSScriptRoot "generate-station-icons.py")
