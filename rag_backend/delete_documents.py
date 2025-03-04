import chromadb
import sys

def get_collection():
    client = chromadb.PersistentClient(path="./db")
    return client.get_or_create_collection("insurance_qa")

def list_documents():
    collection = get_collection()
    results = collection.get()
    
    # Group documents by source
    docs_by_source = {}
    for i, source in enumerate(results['metadatas']):
        src = source.get('source', 'Unknown')
        if src not in docs_by_source:
            docs_by_source[src] = []
        docs_by_source[src].append(results['documents'][i])
    
    # Print documents grouped by source
    print("\nDocuments in the collection:")
    print("===========================")
    for source, docs in docs_by_source.items():
        print(f"\nSource: {source}")
        print(f"Number of chunks: {len(docs)}")

def delete_by_source(source):
    collection = get_collection()
    results = collection.get()
    
    # Find all document IDs with matching source
    ids_to_delete = []
    for i, metadata in enumerate(results['metadatas']):
        if metadata.get('source') == source:
            ids_to_delete.append(results['ids'][i])
    
    if not ids_to_delete:
        print(f"No documents found with source: {source}")
        return
    
    # Delete the documents
    collection.delete(ids=ids_to_delete)
    print(f"Deleted {len(ids_to_delete)} document chunks from source: {source}")

def main():
    while True:
        print("\nRAG Document Management")
        print("1. List all documents")
        print("2. Delete documents by source")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            list_documents()
        elif choice == "2":
            source = input("Enter the source filename to delete: ")
            confirm = input(f"Are you sure you want to delete all documents from '{source}'? (y/N): ")
            if confirm.lower() == 'y':
                delete_by_source(source)
            else:
                print("Deletion cancelled.")
        elif choice == "3":
            print("Exiting...")
            sys.exit(0)
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main() 