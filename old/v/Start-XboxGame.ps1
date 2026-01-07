# Start-XboxGame.ps1
param (
    [string]$gameURI
)

if (-not $gameURI) {
    Write-Host "Proszę podać URI gry."
    exit 1
}

# Uruchamianie gry za pomocą Xbox App
Start-Process "explorer.exe" $gameURI
Write-Host "Uruchamianie gry z URI: $gameURI"