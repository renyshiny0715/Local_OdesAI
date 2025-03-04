from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import chromadb
import os
import json
import uvicorn
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    n_results: Optional[int] = 3
    collection: str

class DeleteRequest(BaseModel):
    source: str
    collection: str

def get_collection(name: str):
    client = chromadb.PersistentClient(path="../db")
    return client.get_or_create_collection(name=name)

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), collection: str = Form(...), metadata: str = Form(None)):
    print(f"\nReceived upload request:")
    print(f"File: {file.filename}")
    print(f"Content type: {file.content_type}")
    print(f"Collection: {collection}")
    print(f"Metadata (relative path): {metadata}")
    print(f"File object type: {type(file)}")

    if not file:
        raise HTTPException(status_code=400, detail="File is required")
    if not collection:
        raise HTTPException(status_code=400, detail="Collection name is required")

    try:
        print(f"Processing file {file.filename} for collection {collection}")
        # Get the appropriate collection
        db_collection = get_collection(collection)
        
        # Read file content
        content = await file.read()
        print(f"Read {len(content)} bytes from file")
        
        if file.filename.lower().endswith('.csv'):
            print("Processing CSV file...")
            # Process CSV file
            lines = content.decode().splitlines()
            if len(lines) < 2:  # Check if file has header and data
                raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
            
            # Process each line as a QA pair
            for i, line in enumerate(lines[1:], 1):  # Skip header
                parts = line.split(',')
                if len(parts) >= 2:
                    question = parts[0].strip('"')
                    answer = parts[1].strip('"')
                    
                    # Add to ChromaDB
                    db_collection.add(
                        documents=[f"Question: {question}\nAnswer: {answer}"],
                        metadatas=[{
                            "source": file.filename,
                            "type": "qa_pair",
                            "question": question
                        }],
                        ids=[f"{file.filename}-{i}"]
                    )
        
        elif file.filename.lower().endswith('.pdf'):
            print("Processing PDF file...")
            # Save PDF content to a temporary file
            import tempfile
            import os
            
            temp_file = None
            temp_path = None
            
            try:
                # Create a temporary file with .pdf extension
                temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
                os.close(temp_fd)  # Close the file descriptor
                
                # Write the content to the temporary file
                with open(temp_path, 'wb') as f:
                    f.write(content)
                
                print(f"Saved PDF to temporary file: {temp_path}")
                print(f"Temp file size: {os.path.getsize(temp_path)} bytes")
                print(f"Content type: {file.content_type}")

                print(f"Extracting text from PDF: {file.filename}")
                # Extract text from PDF
                extracted_text = ""
                try:
                    with pdfplumber.open(temp_path) as pdf:
                        print(f"PDF has {len(pdf.pages)} pages")
                        for page_num, page in enumerate(pdf.pages, 1):
                            print(f"Processing page {page_num}")
                            text = page.extract_text()
                            if text:
                                extracted_text += text + "\n\n"
                except Exception as e:
                    print(f"Error in pdfplumber: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    raise HTTPException(status_code=500, detail=f"Error extracting text from PDF: {str(e)}")

                if not extracted_text.strip():
                    raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")

                print(f"Splitting text into chunks for {file.filename}")
                # Split text into chunks
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200,
                    length_function=len,
                )
                chunks = text_splitter.split_text(extracted_text)

                print(f"Adding {len(chunks)} chunks to ChromaDB for {file.filename}")
                # Add chunks to ChromaDB with enhanced metadata
                for i, chunk in enumerate(chunks):
                    metadata_dict = {
                        "source": file.filename,
                        "type": "pdf_document",
                        "chunk_index": i,
                        "total_chunks": len(chunks)
                    }
                    
                    # Add relative path to metadata if provided
                    if metadata:
                        metadata_dict["relative_path"] = metadata
                        # Extract court level from path for case law
                        if collection == "case_law":
                            path_parts = metadata.split(os.sep)
                            if len(path_parts) > 0:
                                metadata_dict["court"] = path_parts[0]
                    
                    db_collection.add(
                        documents=[chunk],
                        metadatas=[metadata_dict],
                        ids=[f"{file.filename}-{i}"]
                    )

                print(f"Successfully processed PDF: {file.filename}")
                return {"message": f"Successfully processed {file.filename}"}

            except Exception as e:
                print(f"Error processing PDF {file.filename}: {str(e)}")
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
            finally:
                # Clean up temporary file
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                        print(f"Cleaned up temporary file: {temp_path}")
                    except Exception as e:
                        print(f"Error cleaning up temporary file: {str(e)}")
        
        elif file.filename.endswith('.docx'):
            # Process DOCX file (implement DOCX processing logic)
            raise HTTPException(status_code=400, detail="DOCX processing not implemented yet")
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")
        
        return {"message": f"Successfully processed {file.filename}"}
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_documents(request: QueryRequest):
    try:
        # Get the appropriate collection
        collection = get_collection(request.collection)
        
        # Print debug info
        print(f"Querying collection: {request.collection}")
        print(f"Query text: {request.query}")
        print(f"Requested results: {request.n_results}")
        
        # If query is empty, return limited documents
        if not request.query.strip():
            print("Empty query, getting limited documents")
            # Add a hard limit for empty queries to prevent timeouts
            limit = min(request.n_results, 50)  # Reduced to 50 for better performance
            print(f"Using limit: {limit}")
            
            # Get all IDs first to know total count
            all_ids = collection.get(include=[])["ids"]
            total_count = len(all_ids)
            print(f"Total documents in collection: {total_count}")
            
            # Only get the limited number of documents
            limited_ids = all_ids[:limit] if all_ids else []
            print(f"Getting {len(limited_ids)} documents")
            
            if limited_ids:
                # Get only the limited documents with explicit include
                results = collection.get(
                    ids=limited_ids,
                    include=["documents", "metadatas"]
                )
                
                # Format results for empty query
                matches = []
                for i in range(len(results["ids"])):
                    if i < limit:  # Extra safety check
                        doc_text = results["documents"][i] if i < len(results["documents"]) else "No text available"
                        doc_metadata = results["metadatas"][i] if i < len(results["metadatas"]) else {"source": "Unknown"}
                        
                        matches.append({
                            "text": doc_text,
                            "metadata": doc_metadata,
                            "distance": 0
                        })
            else:
                matches = []
        else:
            # Perform the query with a completely different approach
            print("Performing semantic search with new approach")
            limit = min(request.n_results, 50)  # Reduced to 50 for better performance
            
            # Connect directly to ChromaDB
            import chromadb
            client = chromadb.PersistentClient(path="../db")
            chroma_collection = client.get_collection(name=request.collection)
            
            # Query with explicit includes
            query_results = chroma_collection.query(
                query_texts=[request.query],
                n_results=limit,
                include=["documents", "metadatas", "distances"]
            )
            
            # Print debug info
            print(f"ChromaDB query results keys: {query_results.keys()}")
            print(f"Documents length: {len(query_results.get('documents', [[]]))} with first list length: {len(query_results.get('documents', [[]])[0]) if query_results.get('documents') and query_results.get('documents')[0] else 0}")
            print(f"Metadatas length: {len(query_results.get('metadatas', [[]]))} with first list length: {len(query_results.get('metadatas', [[]])[0]) if query_results.get('metadatas') and query_results.get('metadatas')[0] else 0}")
            
            # Build matches manually
            matches = []
            if "documents" in query_results and len(query_results["documents"]) > 0:
                documents = query_results["documents"][0]
                metadatas = query_results["metadatas"][0] if "metadatas" in query_results and len(query_results["metadatas"]) > 0 else []
                distances = query_results["distances"][0] if "distances" in query_results and len(query_results["distances"]) > 0 else []
                
                for i in range(len(documents)):
                    if i < limit:  # Extra safety check
                        doc_text = documents[i] if i < len(documents) else "No text available"
                        doc_metadata = metadatas[i] if i < len(metadatas) else {"source": "Unknown"}
                        doc_distance = distances[i] if i < len(distances) else 0
                        
                        # Debug output for each match
                        print(f"Match {i} text type: {type(doc_text)}")
                        print(f"Match {i} metadata type: {type(doc_metadata)}")
                        print(f"Match {i} text (truncated): {doc_text[:50] if doc_text else 'None'}...")
                        print(f"Match {i} metadata: {doc_metadata}")
                        
                        matches.append({
                            "text": doc_text,
                            "metadata": doc_metadata,
                            "distance": doc_distance
                        })
        
        print(f"Returning {len(matches)} matches")
        return {"matches": matches}
    
    except Exception as e:
        print(f"Error in query_documents: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query_direct")
async def query_documents_direct(request: QueryRequest):
    try:
        # Get the appropriate collection
        collection = get_collection(request.collection)
        
        # Print debug info
        print(f"Direct query for collection: {request.collection}")
        print(f"Query text: {request.query}")
        print(f"Requested results: {request.n_results}")
        
        # If query is empty, return limited documents
        if not request.query.strip():
            print("Empty query, getting limited documents")
            # Add a hard limit for empty queries to prevent timeouts
            limit = min(request.n_results, 50)  # Reduced to 50 for better performance
            
            # Get all IDs first to know total count
            all_ids = collection.get(include=[])["ids"]
            total_count = len(all_ids)
            print(f"Total documents in collection: {total_count}")
            
            # Only get the limited number of documents
            limited_ids = all_ids[:limit] if all_ids else []
            print(f"Getting {len(limited_ids)} documents")
            
            if limited_ids:
                # Get only the limited documents
                results = collection.get(ids=limited_ids, include=["documents", "metadatas"])
                
                # Return the raw results
                return {
                    "raw_results": {
                        "ids": results.get("ids", []),
                        "documents": results.get("documents", []),
                        "metadatas": results.get("metadatas", [])
                    }
                }
            else:
                return {"raw_results": {"ids": [], "documents": [], "metadatas": []}}
        else:
            # Perform the query with a direct approach
            print("Performing direct semantic search")
            limit = min(request.n_results, 50)  # Reduced to 50 for better performance
            
            # Direct query with all includes
            results = collection.query(
                query_texts=[request.query],
                n_results=limit,
                include=["documents", "metadatas", "distances"]
            )
            
            # Print debug info
            print(f"ChromaDB query results keys: {results.keys()}")
            
            # Return the raw results
            return {
                "raw_results": {
                    "ids": results.get("ids", []),
                    "documents": results.get("documents", []),
                    "metadatas": results.get("metadatas", []),
                    "distances": results.get("distances", [])
                }
            }
    
    except Exception as e:
        print(f"Error in query_documents_direct: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.options("/delete")
async def delete_options():
    return {"message": "OK"}

@app.post("/delete")
async def delete_documents(request: DeleteRequest):
    try:
        # Get the appropriate collection
        collection = get_collection(request.collection)
        
        # Get all documents
        results = collection.get()
        
        # Find documents with matching source
        ids_to_delete = []
        for i, metadata in enumerate(results['metadatas']):
            if metadata.get('source') == request.source:
                ids_to_delete.append(results['ids'][i])
        
        if not ids_to_delete:
            raise HTTPException(status_code=404, detail=f"No documents found with source: {request.source}")
        
        # Delete the documents
        collection.delete(ids=ids_to_delete)
        
        return {"message": f"Successfully deleted {len(ids_to_delete)} documents from {request.source}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    # Ensure the db directory exists
    os.makedirs("db", exist_ok=True)
    
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8082) 