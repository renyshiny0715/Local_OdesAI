# Start ngrok for Ollama WebUI with inspection disabled
Write-Host "Starting ngrok for Ollama WebUI on port 8081 with inspection disabled..." -ForegroundColor Green
Write-Host "The ngrok URL will be displayed in the ngrok window." -ForegroundColor Yellow
Write-Host "Press Ctrl+C in the ngrok window to stop the tunnel." -ForegroundColor Yellow

# Check if ngrok is in the PATH
$ngrokCommand = "ngrok"
try {
    $null = Get-Command $ngrokCommand -ErrorAction Stop
    # Start ngrok with the configuration file
    & $ngrokCommand http 8081 --log=stdout --log-level=info --inspect=false
}
catch {
    Write-Host "Error: ngrok command not found." -ForegroundColor Red
    Write-Host "Please make sure ngrok is installed and added to your PATH." -ForegroundColor Red
    Write-Host "You can download ngrok from: https://ngrok.com/download" -ForegroundColor Cyan
    Write-Host "After installation, you may need to run: ngrok authtoken YOUR_AUTH_TOKEN" -ForegroundColor Cyan
    
    # Pause to keep the window open
    Read-Host "Press Enter to exit"
} 