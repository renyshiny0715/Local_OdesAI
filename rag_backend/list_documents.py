import chromadb
from chromadb.config import Settings
from typing import Dict, List
import json

def get_collection(name: str):
    client = chromadb.PersistentClient(path="./db")
    return client.get_or_create_collection(name=name)

def list_documents(collection_name: str) -> Dict:
    collection = get_collection(collection_name)
    results = collection.get()
    
    # Group documents by source
    docs_by_source = {}
    for i, metadata in enumerate(results['metadatas']):
        source = metadata.get('source', 'Unknown')
        if source not in docs_by_source:
            docs_by_source[source] = {
                'count': 0,
                'samples': [],
                'metadata': []
            }
        
        docs_by_source[source]['count'] += 1
        # Store only first 3 samples per source
        if len(docs_by_source[source]['samples']) < 3:
            docs_by_source[source]['samples'].append(results['documents'][i])
            docs_by_source[source]['metadata'].append(metadata)
    
    return docs_by_source

def print_collection_info(name: str):
    print(f"\n{'-'*80}")
    print(f"Collection: {name}")
    print(f"{'-'*80}")
    
    docs = list_documents(name)
    if not docs:
        print("No documents found in collection.")
        return
    
    for source, info in docs.items():
        print(f"\nSource: {source}")
        print(f"Total chunks: {info['count']}")
        print("\nSample chunks with metadata:")
        for i, (sample, metadata) in enumerate(zip(info['samples'], info['metadata']), 1):
            print(f"\nChunk {i}:")
            print("Metadata:", json.dumps(metadata, indent=2))
            print("Content:", sample[:200] + "..." if len(sample) > 200 else sample)
            print("-" * 40)

def main():
    print("Listing documents in RAG collections...")
    
    # List documents in all collections
    collections = ["legal_docs", "insurance_qa", "primary_legislation", "secondary_legislation"]
    for collection in collections:
        try:
            print_collection_info(collection)
        except Exception as e:
            print(f"Error accessing collection {collection}: {str(e)}")
    
    print("\nDone.")

if __name__ == "__main__":
    main() 