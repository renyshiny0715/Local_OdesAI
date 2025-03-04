@echo off
setlocal enabledelayedexpansion

echo Starting server management script...
echo.

:menu
cls
echo Server Management Menu
echo ====================
echo 1. Start all servers
echo 2. Stop all servers
echo 3. Restart all servers
echo 4. Start specific server
echo 5. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto stop_all
if "%choice%"=="3" goto restart_all
if "%choice%"=="4" goto server_selection
if "%choice%"=="5" goto end
goto menu

:stop_all
echo.
echo Stopping all servers and clearing ports...

REM Kill processes on specific ports
for %%p in (3000 3001 8080 8081 8082 11434) do (
    echo Checking port %%p...
    for /f "tokens=5" %%a in ('netstat -aon ^| find "%%p" ^| find "LISTENING"') do (
        echo Terminating process with PID: %%a on port %%p
        taskkill /F /PID %%a 2>nul
    )
)

REM Kill specific processes by name
echo Stopping specific processes...
taskkill /F /IM "node.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
taskkill /F /IM "ollama.exe" 2>nul

echo Waiting for processes to terminate...
timeout /t 5 /nobreak > nul
echo All servers stopped.
echo.
if "%~1"=="" goto menu
goto :eof

:start_all
echo.
echo Starting all servers...

REM Start Ollama (if not already running)
echo Starting Ollama...
start /B cmd /c "ollama serve"
timeout /t 5 /nobreak > nul

REM Start AnythingLLM
echo Starting AnythingLLM...
cd anythingllm
start /B cmd /c "docker-compose up"
cd ..
timeout /t 5 /nobreak > nul

REM Start RAG Backend
echo Starting RAG Backend...
cd rag_backend
start /B cmd /c "call venv\Scripts\activate && python main.py"
cd ..
timeout /t 5 /nobreak > nul

REM Start OdesAI RAG Dashboard
echo Starting OdesAI RAG Dashboard...
start /B cmd /c "call start_odesai_dashboard.bat"
timeout /t 5 /nobreak > nul

REM Start Main Backend
echo Starting Main Backend...
cd backend
start /B cmd /c "call ..\venv\Scripts\activate && python main.py"
cd ..
timeout /t 5 /nobreak > nul

REM Start RAG Test UI
echo Starting RAG Test UI...
cd rag-test-ui
start /B cmd /c "npm run dev"
cd ..
timeout /t 5 /nobreak > nul

REM Start Ollama Web UI
echo Starting Ollama Web UI...
cd ollama-webui
start /B cmd /c "npm run dev"
cd ..

echo.
echo All servers started successfully!
echo.
echo Server URLs:
echo - RAG Test UI: http://localhost:3000
echo - AnythingLLM: http://localhost:3001
echo - Main Backend: http://localhost:8080
echo - Ollama Web UI: http://localhost:8081
echo - RAG Backend: http://localhost:8082
echo - Ollama API: http://localhost:11434
echo - OdesAI RAG Dashboard: http://localhost:8501
echo.
pause
goto menu

:restart_all
call :stop_all silent
goto start_all

:clear_port
echo Clearing port %1...
for /f "tokens=5" %%a in ('netstat -aon ^| find "%1" ^| find "LISTENING"') do (
    echo Terminating process with PID: %%a on port %1
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak > nul
goto :eof

:server_selection
cls
echo Select server to start:
echo 1. RAG Test UI (Port 3000)
echo 2. AnythingLLM (Port 3001)
echo 3. Main Backend (Port 8080)
echo 4. Ollama Web UI (Port 8081)
echo 5. RAG Backend (Port 8082)
echo 6. Ollama API (Port 11434)
echo 7. OdesAI RAG Dashboard (Port 8501)
echo 8. Back to main menu
echo.
set /p server_choice="Enter your choice (1-8): "

if "%server_choice%"=="1" (
    call :clear_port 3000
    echo Starting RAG Test UI...
    cd rag-test-ui
    start /B cmd /c "npm run dev"
    cd ..
) else if "%server_choice%"=="2" (
    call :clear_port 3001
    echo Starting AnythingLLM...
    cd anythingllm
    start /B cmd /c "docker-compose up"
    cd ..
) else if "%server_choice%"=="3" (
    call :clear_port 8080
    echo Starting Main Backend...
    cd backend
    start /B cmd /c "call ..\venv\Scripts\activate && python main.py"
    cd ..
) else if "%server_choice%"=="4" (
    call :clear_port 8081
    echo Starting Ollama Web UI...
    cd ollama-webui
    start /B cmd /c "npm run dev"
    cd ..
) else if "%server_choice%"=="5" (
    call :clear_port 8082
    echo Starting RAG Backend...
    cd rag_backend
    start /B cmd /c "call venv\Scripts\activate && python main.py"
    cd ..
) else if "%server_choice%"=="6" (
    call :clear_port 11434
    echo Starting Ollama API...
    start /B cmd /c "ollama serve"
) else if "%server_choice%"=="7" (
    call :clear_port 8501
    echo Starting OdesAI RAG Dashboard...
    start /B cmd /c "call start_odesai_dashboard.bat"
) else if "%server_choice%"=="8" (
    goto menu
)

echo.
echo Server started. Press any key to return to menu...
pause > nul
goto menu

:end
echo.
echo Exiting server management script...
exit /b 0 