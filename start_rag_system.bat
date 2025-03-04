@echo off
echo Starting Local RAG System...

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo Ollama is not running. Please start Ollama first.
    echo Download from: https://ollama.ai/download
    exit /b 1
)

REM Check if Mistral model is pulled
echo Checking Mistral model...
curl -s http://localhost:11434/api/tags | findstr "mistral" >nul
if errorlevel 1 (
    echo Pulling Mistral model...
    ollama pull mistral
)

REM Start AnythingLLM
cd anythingllm
echo Starting AnythingLLM...
start /B cmd /c "docker-compose up"

REM Wait for AnythingLLM to start
echo Waiting for AnythingLLM to start...
timeout /t 10 /nobreak > nul

REM Open browser
echo Opening AnythingLLM interface...
start http://localhost:3001

echo.
echo RAG System is now running!
echo.
echo Endpoints:
echo - AnythingLLM UI: http://localhost:3001
echo - Ollama API: http://localhost:11434
echo.
echo To stop the system:
echo 1. Run stop.bat in the anythingllm directory
echo 2. Close Ollama if needed
echo.
echo Press Ctrl+C to stop viewing this message... 