from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response, HTMLResponse, StreamingResponse
import aiohttp
import json
from typing import List, Dict
import asyncio
import os

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081", "*"],  # Allow all origins including ngrok
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=os.path.dirname(__file__)), name="static")

@app.get("/test.html")
async def get_test_page():
    return FileResponse(os.path.join(os.path.dirname(__file__), "test.html"))

OLLAMA_API_URL = "http://localhost:11434/api/generate"
RAG_API_URL = "http://localhost:8082"

# Proxy endpoint for RAG queries
@app.options("/api/rag/query")
async def options_rag_query():
    return {"message": "OK"}

@app.post("/api/rag/query")
async def proxy_rag_query(request: Request):
    body = await request.json()
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{RAG_API_URL}/query", json=body) as response:
            result = await response.json()
            return result

# Proxy endpoint for RAG document downloads
@app.get("/api/rag/download/{filename}")
async def proxy_rag_download(filename: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{RAG_API_URL}/download/{filename}") as response:
            if response.status != 200:
                return JSONResponse(
                    status_code=response.status,
                    content={"detail": "Error downloading document"}
                )
            content = await response.read()
            headers = {
                "Content-Disposition": response.headers.get("Content-Disposition", f"attachment; filename={filename}"),
                "Content-Type": response.headers.get("Content-Type", "application/octet-stream")
            }
            return Response(content=content, headers=headers)

@app.get("/")
async def read_root():
    return {"status": "healthy"}

# Proxy endpoint for Ollama API
@app.options("/api/generate")
async def options_generate():
    return {"message": "OK"}

@app.post("/api/generate")
async def proxy_ollama_generate(request: Request):
    try:
        print(f"Received generate request from {request.client.host}")
        print(f"Request headers: {request.headers}")
        
        # Check if this is a form submission
        content_type = request.headers.get("content-type", "")
        print(f"Content-Type: {content_type}")
        
        if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            print("Processing as form data")
            form_data = await request.form()
            print(f"Form data: {form_data}")
            
            # Check if there's a 'data' field containing JSON
            if "data" in form_data:
                try:
                    json_data = json.loads(form_data["data"])
                    print(f"Parsed JSON from form data: {json_data}")
                except json.JSONDecodeError as e:
                    print(f"Error parsing JSON from form data: {e}")
                    return JSONResponse(
                        status_code=400,
                        content={"error": f"Invalid JSON in form data: {str(e)}"}
                    )
            else:
                # If no data field, try to construct JSON from form fields
                print("No 'data' field found, constructing from form fields")
                json_data = {}
                for key, value in form_data.items():
                    if key in ["model", "prompt", "stream"]:
                        if key == "stream":
                            json_data[key] = value.lower() == "true"
                        else:
                            json_data[key] = value
                print(f"Constructed JSON from form fields: {json_data}")
        else:
            # Process as regular JSON request
            print("Processing as JSON request")
            try:
                json_data = await request.json()
                print(f"Request body: {json_data}")
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from request body: {e}")
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Invalid JSON in request body: {str(e)}"}
                )
        
        # Extract parameters
        model = json_data.get("model", "mistral")
        prompt = json_data.get("prompt", "")
        stream = json_data.get("stream", False)
        
        print(f"Model: {model}, Stream: {stream}, Prompt length: {len(prompt)}")
        
        # Forward the request to Ollama
        async with aiohttp.ClientSession() as session:
            ollama_url = "http://localhost:11434/api/generate"
            print(f"Forwarding request to Ollama at {ollama_url}")
            
            async with session.post(
                ollama_url,
                json={"model": model, "prompt": prompt, "stream": stream},
                headers={"Content-Type": "application/json"}
            ) as response:
                print(f"Ollama response status: {response.status}")
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Ollama error: {error_text}")
                    return JSONResponse(
                        status_code=response.status,
                        content={"error": f"Ollama API error: {error_text}"}
                    )
                
                if stream:
                    print("Processing streaming response")
                    return StreamingResponse(
                        stream_ollama_response(response),
                        media_type="text/event-stream"
                    )
                else:
                    print("Processing non-streaming response")
                    response_json = await response.json()
                    print(f"Ollama response: {response_json}")
                    return JSONResponse(content=response_json)
    except Exception as e:
        print(f"Exception in proxy_ollama_generate: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            try:
                # Receive message from client
                message = await websocket.receive_text()
                print(f"Received message from client: {message}")  # Debug log
                response_sent = False
                
                # Prepare the request to Ollama
                data = {
                    "model": "mistral",
                    "prompt": message,
                    "stream": True,
                    "context": []  # Reset context for each message
                }
                
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.post(OLLAMA_API_URL, json=data) as response:
                            print("Started receiving response from Ollama")  # Debug log
                            async for line in response.content:
                                if line:
                                    try:
                                        json_response = json.loads(line.decode('utf-8'))
                                        if 'response' in json_response:
                                            response_text = json_response['response']
                                            if response_text.strip():  # Only send non-empty responses
                                                await websocket.send_text(response_text)
                                                response_sent = True
                                        if json_response.get('done', False):
                                            print("Received done signal from Ollama")  # Debug log
                                            await websocket.send_text("[DONE]")
                                            print("Sent [DONE] marker to client")  # Debug log
                                            response_sent = False  # Reset for next message
                                            break  # Exit the loop after sending [DONE]
                                    except json.JSONDecodeError:
                                        continue
                            
                            # Double check to ensure [DONE] is sent if we got any response
                            if response_sent:
                                print("Sending final [DONE] marker")  # Debug log
                                await websocket.send_text("[DONE]")
                                await asyncio.sleep(0.1)  # Small delay to ensure [DONE] is received
                except Exception as e:
                    print(f"Error in Ollama communication: {str(e)}")
                    if response_sent:
                        await websocket.send_text("[DONE]")
                    raise  # Re-raise the exception to be caught by outer try-except
                                    
            except WebSocketDisconnect:
                print("WebSocket disconnected")  # Debug log
                break
            except Exception as e:
                print(f"Error processing message: {str(e)}")
                await websocket.send_text(f"Error: {str(e)}")
                await websocket.send_text("[DONE]")
                    
    except Exception as e:
        print(f"WebSocket Error: {str(e)}")
    finally:
        try:
            await websocket.close()
        except:
            pass

@app.get("/api/proxy")
async def api_proxy_page():
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>API Proxy</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            textarea {
                width: 100%;
                height: 200px;
                margin-bottom: 10px;
            }
            button {
                padding: 10px 15px;
                background-color: #4CAF50;
                color: white;
                border: none;
                cursor: pointer;
            }
            pre {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                white-space: pre-wrap;
            }
        </style>
    </head>
    <body>
        <h1>API Proxy</h1>
        <p>Enter your JSON request below:</p>
        <textarea id="requestData">{
  "model": "mistral",
  "prompt": "Say hello briefly",
  "stream": false
}</textarea>
        <button onclick="sendRequest()">Send Request</button>
        <h2>Response:</h2>
        <pre id="response"></pre>

        <script>
            async function sendRequest() {
                const requestData = document.getElementById('requestData').value;
                const responseElement = document.getElementById('response');
                
                try {
                    const jsonData = JSON.parse(requestData);
                    responseElement.textContent = 'Sending request...';
                    
                    const response = await fetch('/api/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: requestData
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        responseElement.textContent = JSON.stringify(data, null, 2);
                    } else {
                        responseElement.textContent = `Error: ${response.status} ${response.statusText}`;
                    }
                } catch (error) {
                    responseElement.textContent = `Error: ${error.message}`;
                }
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# Function to stream Ollama API responses
async def stream_ollama_response(response):
    async for chunk in response.content.iter_any():
        if chunk:
            yield chunk

# Add a proxy endpoint for fetch requests
@app.post("/api/proxy/fetch")
async def proxy_fetch(request: Request):
    try:
        print(f"Received proxy fetch request from {request.client.host}")
        
        # Parse the request body
        body = await request.json()
        print(f"Request body: {body}")
        
        # Extract parameters
        model = body.get("model", "mistral")
        prompt = body.get("prompt", "")
        stream = body.get("stream", False)
        
        print(f"Model: {model}, Stream: {stream}, Prompt length: {len(prompt)}")
        
        # Forward the request to Ollama
        async with aiohttp.ClientSession() as session:
            ollama_url = "http://localhost:11434/api/generate"
            print(f"Forwarding request to Ollama at {ollama_url}")
            
            async with session.post(
                ollama_url,
                json={"model": model, "prompt": prompt, "stream": stream},
                headers={"Content-Type": "application/json"}
            ) as response:
                print(f"Ollama response status: {response.status}")
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Ollama error: {error_text}")
                    return JSONResponse(
                        status_code=response.status,
                        content={"error": f"Ollama API error: {error_text}"}
                    )
                
                # For non-streaming responses
                print("Processing non-streaming response")
                response_json = await response.json()
                print(f"Ollama response: {response_json}")
                return JSONResponse(content=response_json)
    except Exception as e:
        print(f"Exception in proxy_fetch: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    print(f"Server running at http://localhost:8080")
    print(f"Test page available at http://localhost:8080/test.html")
    uvicorn.run(app, host="0.0.0.0", port=8080) 