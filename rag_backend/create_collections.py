import chromadb
from chromadb.config import Settings

def create_collections():
    # Initialize ChromaDB client
    client = chromadb.PersistentClient(path="./db")
    
    # Collections to create
    collections = [
        "primary_legislation",
        "secondary_legislation",
        "case_law",
        "non_statutory_rules"
    ]
    
    # Create each collection
    created_collections = []
    for name in collections:
        try:
            collection = client.create_collection(name=name)
            print(f"Created collection: {name}")
            created_collections.append(name)
        except ValueError as e:
            if "Collection already exists" in str(e):
                print(f"Collection already exists: {name}")
                created_collections.append(name)
            else:
                print(f"Error creating collection {name}: {str(e)}")
    
    # List all collections
    print("\nAll available collections:")
    print("-------------------------")
    all_collections = client.list_collections()
    for collection in all_collections:
        print(f"- {collection.name}")
        
    return created_collections

def main():
    print("Creating legal document collections...")
    created = create_collections()
    
    print("\nCreation complete!")
    print(f"Successfully created/verified {len(created)} collections:")
    for name in created:
        print(f"- {name}")

if __name__ == "__main__":
    main() 