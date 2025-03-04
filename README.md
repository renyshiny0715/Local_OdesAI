# Local RAG System with AnythingLLM and Ollama

This repository contains a local Retrieval-Augmented Generation (RAG) system that uses AnythingLLM for document processing and Ollama for running the Mistral language model.

## Architecture

The system consists of three main layers:

1. **Language Model Layer (Bottom)**
   - Mistral model running locally
   - Managed by Ollama

2. **Model Service Layer (Middle)**
   - Ollama server
   - Handles model inference and API requests

3. **RAG Service Layer (Top)**
   - AnythingLLM
   - Processes documents and manages knowledge base
   - Integrates with Ollama for enhanced responses

## Prerequisites

1. [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. [Ollama](https://ollama.ai/download)
3. At least 8GB RAM
4. 20GB free disk space

## Setup

1. Install Docker Desktop and Ollama
2. Run `setup_anythingllm.bat` to set up AnythingLLM
3. Place your documents in the `knowledge` directory
4. Run `start_rag_system.bat` to start the entire system

## Usage

1. Access AnythingLLM at http://localhost:3001
2. Upload documents through the web interface
3. Start chatting with AI that has access to your knowledge base

## Directory Structure

```
.
├── anythingllm/          # AnythingLLM container and config
│   ├── storage/          # Document storage
│   ├── start.bat         # Start AnythingLLM
│   └── stop.bat          # Stop AnythingLLM
├── knowledge/            # Your private documents
├── setup_anythingllm.bat # Setup script
└── start_rag_system.bat  # Master startup script
```

## Stopping the System

1. Run `stop.bat` in the anythingllm directory
2. Close Ollama if needed

## Troubleshooting

1. If AnythingLLM fails to start:
   - Check Docker is running
   - Ensure ports 3001 and 11434 are free

2. If document processing fails:
   - Check file permissions
   - Ensure documents are in supported formats

3. If Ollama connection fails:
   - Verify Ollama is running
   - Check if Mistral model is pulled

## Security Notes

- This system runs entirely locally
- No data is sent to external services
- Documents remain in your private storage
- Access is restricted to localhost by default 