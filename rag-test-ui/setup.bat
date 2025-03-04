@echo off
echo Setting up RAG Test UI...

REM Install dependencies
echo Installing dependencies...
call npm install

REM Start the development server
echo Starting development server...
call npm run dev 