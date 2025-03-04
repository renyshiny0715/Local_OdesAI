# Running Ollama WebUI via ngrok

This guide explains how to run the Ollama WebUI on port 8081 and expose it via ngrok.

## Prerequisites

1. Make sure you have ngrok installed and configured:
   - Download from: https://ngrok.com/download
   - Sign up for a free account to get your authtoken
   - Run `ngrok authtoken YOUR_AUTH_TOKEN` to configure ngrok

2. Make sure you have Node.js and npm installed for the frontend.

3. Make sure you have Python installed for the backend servers.

## Starting the Servers

### Option 1: Using the PowerShell Scripts

1. Start all servers (backend, RAG backend, and Ollama WebUI):
   ```
   .\start_servers.ps1
   ```

2. In a separate PowerShell window, start ngrok:
   ```
   .\start_ngrok.ps1
   ```

### Option 2: Manual Startup

1. Start the main backend server:
   ```
   cd backend
   python main.py
   ```

2. Start the RAG backend server:
   ```
   cd rag_backend
   python main.py
   ```

3. Start the Ollama WebUI on port 8081:
   ```
   cd ollama-webui
   npm run start:8081
   ```

4. Start ngrok to expose the Ollama WebUI:
   ```
   ngrok http 8081
   ```

## Accessing the Ollama WebUI

- Local access: http://localhost:8081
- Remote access: Use the URL provided by ngrok (e.g., https://xxxx-xx-xxx-xxx-xx.ngrok-free.app)

## Troubleshooting

1. If you see CORS errors in the browser console:
   - Make sure both backend servers are running
   - Check that the API configuration in the frontend is correct

2. If ngrok shows an authentication error:
   - Make sure you've configured ngrok with your authtoken
   - Check that you're not exceeding the free tier limits (1 concurrent tunnel)

3. If the backend servers fail to start:
   - Check if the ports (8080, 8082) are already in use
   - Try restarting your computer to free up the ports 