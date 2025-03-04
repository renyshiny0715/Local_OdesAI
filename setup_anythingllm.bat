@echo off
echo Setting up AnythingLLM with Docker...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker is not installed. Please install Docker Desktop first.
    echo Download from: https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Create directories
mkdir anythingllm 2>nul
cd anythingllm

REM Create docker-compose.yml
echo version: '3.8' > docker-compose.yml
echo services: >> docker-compose.yml
echo   anything-llm: >> docker-compose.yml
echo     image: mintplexlabs/anythingllm:latest >> docker-compose.yml
echo     ports: >> docker-compose.yml
echo       - "3001:3001" >> docker-compose.yml
echo     environment: >> docker-compose.yml
echo       - OLLAMA_ENDPOINT=http://host.docker.internal:11434 >> docker-compose.yml
echo       - OLLAMA_MODEL=mistral >> docker-compose.yml
echo       - STORAGE_DIR=/app/storage >> docker-compose.yml
echo     volumes: >> docker-compose.yml
echo       - ./storage:/app/storage >> docker-compose.yml
echo       - ../knowledge:/app/knowledge:ro >> docker-compose.yml

REM Create storage directory
mkdir storage 2>nul

REM Create start script
echo @echo off > start.bat
echo echo Starting AnythingLLM... >> start.bat
echo docker-compose up >> start.bat

REM Create stop script
echo @echo off > stop.bat
echo echo Stopping AnythingLLM... >> stop.bat
echo docker-compose down >> stop.bat

echo Setup complete! To start AnythingLLM:
echo 1. Make sure Ollama is running with the Mistral model
echo 2. Run start.bat in the anythingllm directory
echo.
echo AnythingLLM will be available at:
echo http://localhost:3001 