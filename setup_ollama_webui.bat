@echo off
echo Setting up ollama-webui...

REM Remove existing installation if any
if exist ollama-webui (
    rd /s /q ollama-webui
)

REM Create new directory
mkdir ollama-webui
cd ollama-webui

REM Initialize a new Node.js project
echo { > package.json
echo   "name": "ollama-webui", >> package.json
echo   "version": "1.0.0", >> package.json
echo   "private": true, >> package.json
echo   "type": "module", >> package.json
echo   "scripts": { >> package.json
echo     "dev": "vite", >> package.json
echo     "build": "vite build", >> package.json
echo     "preview": "vite preview" >> package.json
echo   } >> package.json
echo } >> package.json

REM Install dependencies
call npm install --save vite@4.5.1
call npm install --save @vitejs/plugin-react@4.2.1
call npm install --save react@18.2.0 react-dom@18.2.0
call npm install --save @mui/material@5.15.5 @emotion/react@11.11.3 @emotion/styled@11.11.0
call npm install --save @mui/icons-material@5.15.5

REM Create configuration for backend connection
mkdir src
echo import { defineConfig } from 'vite'; > vite.config.js
echo import react from '@vitejs/plugin-react'; >> vite.config.js
echo. >> vite.config.js
echo export default defineConfig({ >> vite.config.js
echo   plugins: [react()], >> vite.config.js
echo   server: { >> vite.config.js
echo     port: 3000, >> vite.config.js
echo     proxy: { >> vite.config.js
echo       '/api': { >> vite.config.js
echo         target: 'http://localhost:8080', >> vite.config.js
echo         changeOrigin: true >> vite.config.js
echo       }, >> vite.config.js
echo       '/chat': { >> vite.config.js
echo         target: 'ws://localhost:8080', >> vite.config.js
echo         ws: true >> vite.config.js
echo       } >> vite.config.js
echo     } >> vite.config.js
echo   } >> vite.config.js
echo }); >> vite.config.js

REM Create basic React app structure
mkdir src\components
echo import React from 'react'; > src\main.jsx
echo import ReactDOM from 'react-dom/client'; >> src\main.jsx
echo import App from './App'; >> src\main.jsx
echo import { ThemeProvider, createTheme } from '@mui/material/styles'; >> src\main.jsx
echo import CssBaseline from '@mui/material/CssBaseline'; >> src\main.jsx
echo. >> src\main.jsx
echo const darkTheme = createTheme({ >> src\main.jsx
echo   palette: { >> src\main.jsx
echo     mode: 'dark', >> src\main.jsx
echo   }, >> src\main.jsx
echo }); >> src\main.jsx
echo. >> src\main.jsx
echo ReactDOM.createRoot(document.getElementById('root')).render( >> src\main.jsx
echo   ^<React.StrictMode^> >> src\main.jsx
echo     ^<ThemeProvider theme={darkTheme}^> >> src\main.jsx
echo       ^<CssBaseline /^> >> src\main.jsx
echo       ^<App /^> >> src\main.jsx
echo     ^</ThemeProvider^> >> src\main.jsx
echo   ^</React.StrictMode^> >> src\main.jsx
echo ); >> src\main.jsx

REM Create index.html
echo ^<!DOCTYPE html^> > index.html
echo ^<html lang="en"^>>> index.html
echo ^<head^>>> index.html
echo   ^<meta charset="UTF-8" /^>>> index.html
echo   ^<meta name="viewport" content="width=device-width, initial-scale=1.0" /^>>> index.html
echo   ^<title^>Ollama Chat^</title^>>> index.html
echo   ^<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" /^>>> index.html
echo ^</head^>>> index.html
echo ^<body^>>> index.html
echo   ^<div id="root"^>^</div^>>> index.html
echo   ^<script type="module" src="/src/main.jsx"^>^</script^>>> index.html
echo ^</body^>>> index.html
echo ^</html^>>> index.html

REM Create .env file
echo VITE_OLLAMA_API_BASE_URL=http://localhost:8080 > .env
echo VITE_WS_URL=ws://localhost:8080/chat >> .env
echo PORT=3000 >> .env

REM Start the development server
echo Starting ollama-webui...
call npm run dev 