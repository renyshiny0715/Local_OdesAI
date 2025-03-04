@echo off
echo ================================================
echo OdesAI RAG Interactive Dashboard
echo ================================================
echo.
echo This script will:
echo 1. Navigate to the rag_backend directory
echo 2. Apply the local model patch
echo 3. Start the Streamlit dashboard with OdesAI branding on port 8501
echo.
echo The dashboard will be available at:
echo http://localhost:8501
echo.
echo Press Ctrl+C in the dashboard window to stop it when done.
echo.

REM Check if port 8501 is already in use
echo Checking if port 8501 is already in use...
netstat -ano | findstr :8501 > nul
if %ERRORLEVEL% EQU 0 (
    echo Port 8501 is already in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8501 ^| findstr "LISTENING"') do (
        echo Terminating process with PID: %%a
        taskkill /F /PID %%a
        if %ERRORLEVEL% EQU 0 (
            echo Successfully freed port 8501.
        ) else (
            echo Failed to free port 8501. Please close the application using this port manually.
            pause
            exit /b 1
        )
    )
)

REM Check if rag_backend directory exists
if not exist "rag_backend" (
    echo Error: rag_backend directory not found.
    echo Please make sure you are running this script from the correct location.
    pause
    exit /b 1
)

REM Navigate to rag_backend directory
echo Navigating to rag_backend directory...
cd rag_backend

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Apply the local model patch
echo Applying local model patch...
python local_model_patch.py

REM Check if patch was successful
if %ERRORLEVEL% NEQ 0 (
    echo Patch application failed. Exiting.
    call venv\Scripts\deactivate
    cd ..
    pause
    exit /b 1
)

REM Run the Streamlit dashboard
echo.
echo Starting OdesAI RAG Dashboard...
echo.
echo If you encounter any issues, please check the terminal output for errors.
echo.
echo ------------------------------------------------
echo Dashboard is starting...
echo When ready, access it at: http://localhost:8501
echo ------------------------------------------------
echo.

python -m streamlit run visualize_workflow_enhanced.py --server.port 8501

REM If the script exits, deactivate the virtual environment
call venv\Scripts\deactivate

REM Return to the original directory
cd ..

echo.
echo ================================================
echo Dashboard session has ended.
echo ================================================
echo.
pause 