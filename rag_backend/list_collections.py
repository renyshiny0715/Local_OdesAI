import chromadb

def list_all_collections():
    # Initialize ChromaDB client
    client = chromadb.PersistentClient(path="./db")
    
    # Get all collections
    collections = client.list_collections()
    
    print("\nAll ChromaDB Collections:")
    print("-------------------------")
    
    if not collections:
        print("No collections found.")
        return
    
    for i, collection in enumerate(collections, 1):
        print(f"{i}. {collection.name}")
        # Get count of documents in collection
        try:
            results = collection.get()
            doc_count = len(results['ids']) if results['ids'] else 0
            print(f"   - Documents: {doc_count}")
        except Exception as e:
            print(f"   - Error getting document count: {str(e)}")
    
    print("\nTotal collections:", len(collections))

if __name__ == "__main__":
    print("Listing all ChromaDB collections...")
    list_all_collections()
    print("\nDone.") 