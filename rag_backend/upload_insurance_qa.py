import chromadb
import pandas as pd
import uuid
from typing import List, Dict, Tuple
import textwrap

def get_collection():
    """Get or create the insurance_qa collection"""
    client = chromadb.PersistentClient(path="./db")
    return client.get_or_create_collection(
        name="insurance_qa",
        metadata={"hnsw:space": "cosine"}
    )

def process_qa_pair(question: str, answer: str, chunk_size: int = 1000, chunk_overlap: int = 50) -> List[Tuple[str, Dict]]:
    """Process a Q&A pair into chunks with metadata"""
    # Clean the text
    question = question.strip().replace('"', "'")
    answer = answer.strip().replace('"', "'")
    
    # If answer is shorter than chunk_size, keep it as one piece
    if len(answer) <= chunk_size:
        return [(
            f"Q: {question}\n\nA: {answer}",
            {
                "question": question,
                "type": "qa_pair",
                "chunk_index": 0,
                "total_chunks": 1
            }
        )]
    
    # Split answer into chunks
    chunks = []
    start = 0
    chunk_index = 0
    
    while start < len(answer):
        # Get chunk with overlap
        chunk = answer[start:start + chunk_size]
        
        # If this is not the first chunk, include the overlap from the previous chunk
        if start > 0:
            chunk = answer[start - chunk_overlap:start + chunk_size]
        
        # Prepare the full text with question for first chunk or just the answer part for subsequent chunks
        if chunk_index == 0:
            text = f"Q: {question}\n\nA: {chunk}"
        else:
            text = f"A (continued): {chunk}"
        
        chunks.append((
            text,
            {
                "question": question,
                "type": "qa_pair",
                "chunk_index": chunk_index,
                "total_chunks": (len(answer) + chunk_size - 1) // chunk_size
            }
        ))
        
        # Move to next chunk
        start += chunk_size - chunk_overlap
        chunk_index += 1
    
    return chunks

def upload_csv(file_path: str, chunk_size: int = 1000, chunk_overlap: int = 50):
    """Upload CSV file to ChromaDB"""
    # Read CSV file
    df = pd.read_csv(file_path)
    
    # Get collection
    collection = get_collection()
    
    # Process each Q&A pair
    all_chunks = []
    all_ids = []
    all_metadatas = []
    
    for _, row in df.iterrows():
        question = row['Question']
        answer = row['Answer']
        
        # Skip if either question or answer is empty
        if pd.isna(question) or pd.isna(answer):
            continue
            
        # Process the Q&A pair into chunks
        chunks = process_qa_pair(question, answer, chunk_size, chunk_overlap)
        
        # Generate unique ID base for this Q&A pair
        qa_id_base = str(uuid.uuid4())
        
        # Add chunks to lists
        for i, (text, metadata) in enumerate(chunks):
            chunk_id = f"{qa_id_base}_{i}"
            all_ids.append(chunk_id)
            all_chunks.append(text)
            all_metadatas.append(metadata)
            
            # Add chunks in batches of 100 to avoid memory issues
            if len(all_chunks) >= 100:
                collection.add(
                    ids=all_ids,
                    documents=all_chunks,
                    metadatas=all_metadatas
                )
                all_chunks = []
                all_ids = []
                all_metadatas = []
    
    # Add any remaining chunks
    if all_chunks:
        collection.add(
            ids=all_ids,
            documents=all_chunks,
            metadatas=all_metadatas
        )

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python upload_insurance_qa.py <csv_file_path>")
        sys.exit(1)
        
    csv_file = sys.argv[1]
    print(f"Processing {csv_file}...")
    upload_csv(csv_file)
    print("Upload complete!") 