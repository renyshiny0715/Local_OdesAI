# Restart Backend server
Write-Host "Restarting Backend server..." -ForegroundColor Green

# Change to the backend directory
Set-Location -Path "backend"

# Start the server
Write-Host "Starting backend server..." -ForegroundColor Cyan
python main.py 