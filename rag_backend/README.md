# RAG System for Legal AI

This is a Retrieval-Augmented Generation (RAG) system designed for legal document processing and querying. The system uses ChromaDB as a vector database and provides various tools for document processing, embedding generation, and similarity search.

## Setup and Installation

1. Make sure you have Python 3.8+ installed
2. Navigate to the project directory
3. Create a virtual environment:
   ```
   python -m venv venv
   ```
4. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
5. Install the required packages:
   ```
   pip install -r visualization_requirements.txt
   ```

## Running the Interactive Dashboard

The easiest way to interact with the RAG system is through the Streamlit dashboard:

```
python run_streamlit_dashboard.py
```

This will start the Streamlit server and open the dashboard in your web browser. If it doesn't open automatically, you can access it at http://localhost:8501.

## Uploading Data

There are several ways to upload data to the system:

1. **Using the Streamlit Dashboard**:
   - Navigate to the "Document Input" tab
   - Enter text directly or upload files (txt, pdf, docx, csv)
   - Process the document and store it in a collection

2. **Using the Upload Scripts**:
   - For JSON data: `python upload_from_json.py sample_data.json`
   - For custom data: Edit the `CUSTOM_DATA` list in `upload_custom_data.py` and run `python upload_custom_data.py`
   - For sample legal documents: `python upload_sample_doc.py`

## Querying the System

1. **Using the Streamlit Dashboard**:
   - Navigate to the "Similarity Search" tab
   - Select a collection
   - Enter your query
   - View the results with relevance scores

2. **Using the Query Scripts**:
   - For basic queries: `python test_query.py "your query here"`
   - For querying legal documents: `python query_legal_docs.py`
   - For querying across all collections: `python query_all_collections.py`

## Managing Collections

1. **Listing Collections**:
   - Run `python list_collections.py` to see all available collections

2. **Checking Collection Contents**:
   - Run `python check_collections.py` to see details of all collections
   - Run `python check_insurance_qa.py` to see details of the insurance_qa collection
   - Run `python check_legal_docs.py` to see details of the legal_docs collection

3. **Emptying a Collection**:
   - Run `python empty_insurance_qa.py` to empty the insurance_qa collection

## Visualizations

The system includes several visualization tools:

1. **Static Workflow Diagram**:
   - Run `python workflow_diagram.py` to generate a static diagram of the RAG workflow

2. **RAG Pipeline Demo**:
   - Run `python rag_pipeline.py` to see a demonstration of the RAG pipeline

## Troubleshooting

If you encounter any issues with dependencies, try updating the packages:

```
pip install --upgrade huggingface-hub sentence-transformers transformers
```

If the Streamlit dashboard fails to start, check that all dependencies are installed correctly and that the port 8501 is not already in use.

## File Structure

- `visualize_workflow_enhanced.py`: The main Streamlit dashboard
- `run_streamlit_dashboard.py`: Script to run the Streamlit dashboard
- `upload_*.py`: Scripts for uploading data to ChromaDB
- `query_*.py`: Scripts for querying data from ChromaDB
- `check_*.py`: Scripts for checking collection contents
- `sample_data.json`: Sample data for testing
- `visualization_requirements.txt`: Required packages for the system 