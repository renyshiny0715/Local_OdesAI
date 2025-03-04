# Restart Ollama WebUI server
Write-Host "Restarting Ollama WebUI server..." -ForegroundColor Green

# Change to the ollama-webui directory
Set-Location -Path "ollama-webui"

# Start the server on port 8081
Write-Host "Starting server on port 8081..." -ForegroundColor Cyan
npm run start:8081 