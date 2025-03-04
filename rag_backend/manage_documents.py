import chromadb
import json
import sys

def list_documents(collection_name):
    """List all documents in a collection with their IDs."""
    client = chromadb.PersistentClient(path="./db")
    try:
        collection = client.get_collection(collection_name)
        results = collection.get()
        
        print(f"\nDocuments in collection '{collection_name}':")
        print("-" * 50)
        
        if not results["ids"]:
            print("No documents found in collection.")
            return
        
        for i, (doc_id, doc, metadata) in enumerate(zip(
            results["ids"],
            results["documents"],
            results["metadatas"]
        ), 1):
            print(f"\nDocument {i}:")
            print(f"ID: {doc_id}")
            if metadata:
                print(f"Metadata: {json.dumps(metadata, indent=2)}")
            print(f"Content preview: {doc[:200]}...")
        
        print(f"\nTotal documents: {len(results['ids'])}")
    
    except Exception as e:
        print(f"Error: {str(e)}")

def delete_documents(collection_name, doc_ids):
    """Delete specific documents from a collection."""
    client = chromadb.PersistentClient(path="./db")
    try:
        collection = client.get_collection(collection_name)
        collection.delete(ids=doc_ids)
        print(f"Successfully deleted {len(doc_ids)} document(s) from '{collection_name}'")
    except Exception as e:
        print(f"Error deleting documents: {str(e)}")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  List documents:   python manage_documents.py list <collection_name>")
        print("  Delete documents: python manage_documents.py delete <collection_name> <doc_id1> [doc_id2 ...]")
        return
    
    command = sys.argv[1]
    
    if command == "list" and len(sys.argv) == 3:
        collection_name = sys.argv[2]
        list_documents(collection_name)
    
    elif command == "delete" and len(sys.argv) >= 4:
        collection_name = sys.argv[2]
        doc_ids = sys.argv[3:]
        delete_documents(collection_name, doc_ids)
    
    else:
        print("Invalid command or arguments.")
        print("Usage:")
        print("  List documents:   python manage_documents.py list <collection_name>")
        print("  Delete documents: python manage_documents.py delete <collection_name> <doc_id1> [doc_id2 ...]")

if __name__ == "__main__":
    main() 