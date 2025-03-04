# Start servers script for Windows PowerShell

# Function to start a server in a new PowerShell window
function Start-ServerInNewWindow {
    param (
        [string]$Directory,
        [string]$Command,
        [string]$WindowTitle
    )
    
    $scriptBlock = {
        param($dir, $cmd, $title)
        cd $dir
        $host.UI.RawUI.WindowTitle = $title
        Invoke-Expression $cmd
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", 
        "& {Set-Location '$Directory'; `$host.UI.RawUI.WindowTitle = '$WindowTitle'; $Command}"
}

Write-Host "Starting backend servers..." -ForegroundColor Green

# Start the main backend server
Start-ServerInNewWindow -Directory "backend" -Command "python main.py" -WindowTitle "Main Backend Server"

# Wait a moment to ensure the first server starts properly
Start-Sleep -Seconds 2

# Start the RAG backend server
Start-ServerInNewWindow -Directory "rag_backend" -Command "python main.py" -WindowTitle "RAG Backend Server"

# Wait a moment to ensure the second server starts properly
Start-Sleep -Seconds 2

# Start the Ollama WebUI on port 8081
Start-ServerInNewWindow -Directory "ollama-webui" -Command "npm run start:8081" -WindowTitle "Ollama WebUI Server"

Write-Host "All servers started. Please check the individual windows for any errors." -ForegroundColor Green
Write-Host "Main Backend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "RAG Backend: http://localhost:8082" -ForegroundColor Cyan
Write-Host "Ollama WebUI: http://localhost:8081" -ForegroundColor Cyan
Write-Host "To expose Ollama WebUI via ngrok, run: ngrok http 8081" -ForegroundColor Yellow 