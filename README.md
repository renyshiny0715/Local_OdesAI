# Local OdesAI

A comprehensive Legal AI system with RAG (Retrieval-Augmented Generation) capabilities and multiple UI components.

## Project Overview

This project integrates various components to create a powerful Legal AI system:

- **RAG Backend**: Python-based backend for document retrieval and question answering
- **Main Backend**: Serves as a proxy and coordinator between different components
- **Ollama WebUI**: Custom web interface for interacting with Ollama LLM models
- **RAG Test UI**: Interface for testing and using the RAG capabilities
- **AnythingLLM**: Document management and vector database integration

## System Architecture

The system consists of several interconnected components:

- **Backend Services**:
  - Main Backend (Port 8080): Coordinates between UI and other services
  - RAG Backend (Port 8082): Handles document retrieval and RAG operations
  - Ollama API (Port 11434): Local LLM service

- **Frontend Applications**:
  - Ollama WebUI (Port 8081): Custom interface for Ollama
  - RAG Test UI (Port 3000): Interface for testing RAG capabilities
  - AnythingLLM (Port 3001): Document management interface
  - OdesAI RAG Dashboard (Port 8501): Streamlit dashboard for RAG visualization

## Setup Instructions

### Prerequisites

- Windows 10/11
- Node.js and npm
- Python 3.9+
- Docker
- Ollama
- ngrok (for remote access)

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/renyshiny0715/Local_OdesAI.git
   cd Local_OdesAI
   ```

2. Set up Python environment:
   ```
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Install Node.js dependencies:
   ```
   cd ollama-webui
   npm install
   cd ../rag-test-ui
   npm install
   ```

4. Start the services:
   ```
   .\start_all_servers!!!.bat
   ```

### Remote Access

To access the Ollama WebUI remotely:

1. Start ngrok:
   ```
   .\start_ngrok.ps1
   ```

2. Access the provided ngrok URL from any device.

## Usage

- **RAG Test UI**: http://localhost:3000
- **AnythingLLM**: http://localhost:3001
- **Main Backend**: http://localhost:8080
- **Ollama Web UI**: http://localhost:8081
- **RAG Backend**: http://localhost:8082
- **Ollama API**: http://localhost:11434
- **OdesAI RAG Dashboard**: http://localhost:8501

## License

[Specify your license here]

## Acknowledgements

[Any acknowledgements or credits] 