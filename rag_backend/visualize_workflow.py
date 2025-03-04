import streamlit as st
import chromadb
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
import plotly.express as px
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
import time
import uuid

# Set page config
st.set_page_config(page_title="RAG Workflow Visualizer", layout="wide")

# Title and description
st.title("RAG Workflow Visualization")

# Initialize ChromaDB client
@st.cache_resource
def get_chroma_client():
    return chromadb.PersistentClient(path="./db")

client = get_chroma_client()

# Display existing collections
st.header("Existing Collections")
collections = client.list_collections()
if collections:
    for collection in collections:
        st.subheader(f"Collection: {collection.name}")
        try:
            results = collection.get()
            st.write(f"Total documents: {len(results['ids'])}")
            
            # Show sample documents
            if results['documents']:
                st.write("Sample documents:")
                for i, (doc, metadata) in enumerate(zip(results['documents'][:3], results['metadatas'][:3])):
                    with st.expander(f"Document {i+1}"):
                        st.json(metadata)
                        st.text_area("Content", doc, height=150)
        except Exception as e:
            st.error(f"Error reading collection {collection.name}: {str(e)}")
else:
    st.write("No collections found in the database.")

st.markdown("---")

st.markdown("""
This dashboard visualizes the Retrieval-Augmented Generation (RAG) workflow:
1. **Document Chunking**: Split documents into manageable chunks
2. **Embedding Generation**: Convert text chunks to vector embeddings
3. **Vector Storage**: Store embeddings in ChromaDB
4. **Similarity Search**: Retrieve relevant chunks based on query similarity
""")

# Initialize components
@st.cache_resource
def load_embedding_model():
    return SentenceTransformer("all-MiniLM-L6-v2")

model = load_embedding_model()

# Sidebar for configuration
st.sidebar.header("Configuration")

# Text input
st.sidebar.subheader("Input Document")
document_text = st.sidebar.text_area(
    "Enter document text",
    "This is a sample document about ChromaDB. ChromaDB is an open-source embedding database. It allows you to store and query embeddings and their metadata. It's designed to be fast, scalable, and easy to use.",
    height=200
)

# Chunking parameters
st.sidebar.subheader("Chunking Parameters")
chunk_size = st.sidebar.slider("Chunk Size (characters)", 50, 500, 100)
chunk_overlap = st.sidebar.slider("Chunk Overlap (characters)", 0, 100, 20)

# Collection name
collection_name = st.sidebar.text_input("Collection Name", "demo_collection")

# Main content area with tabs
tab1, tab2, tab3, tab4 = st.tabs(["1. Text Chunking", "2. Embedding Generation", "3. Vector Storage", "4. Similarity Search"])

# Process button
if st.sidebar.button("Process Document"):
    # 1. Text Chunking
    with tab1:
        st.subheader("Text Chunking")
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
        )
        
        with st.spinner("Splitting text into chunks..."):
            chunks = text_splitter.split_text(document_text)
            
            # Display chunks
            st.write(f"Generated {len(chunks)} chunks:")
            for i, chunk in enumerate(chunks):
                st.text_area(f"Chunk {i+1}", chunk, height=100)
                
            # Visualize chunk sizes
            chunk_lengths = [len(chunk) for chunk in chunks]
            chart_data = pd.DataFrame({
                "Chunk": range(1, len(chunks) + 1),
                "Length": chunk_lengths
            })
            st.bar_chart(chart_data.set_index("Chunk"))
    
    # 2. Embedding Generation
    with tab2:
        st.subheader("Embedding Generation")
        
        with st.spinner("Generating embeddings..."):
            # Generate embeddings
            embeddings = model.encode(chunks)
            
            # Display embedding dimensions
            st.write(f"Embedding dimensions: {embeddings.shape}")
            
            # Visualize embeddings with PCA
            pca = PCA(n_components=2)
            reduced_embeddings = pca.fit_transform(embeddings)
            
            # Create DataFrame for plotting
            df = pd.DataFrame({
                "x": reduced_embeddings[:, 0],
                "y": reduced_embeddings[:, 1],
                "chunk": [f"Chunk {i+1}" for i in range(len(chunks))]
            })
            
            # Plot with Plotly
            fig = px.scatter(df, x="x", y="y", hover_data=["chunk"], 
                            title="2D PCA Visualization of Embeddings")
            st.plotly_chart(fig, use_container_width=True)
            
            # Show sample embedding values
            if len(chunks) > 0:
                st.write("Sample embedding values (first chunk):")
                st.line_chart(pd.DataFrame(embeddings[0][:20]).T)
    
    # 3. Vector Storage
    with tab3:
        st.subheader("Vector Storage in ChromaDB")
        
        with st.spinner("Storing vectors in ChromaDB..."):
            # Create or get collection
            try:
                collection = client.get_or_create_collection(name=collection_name)
                
                # Generate IDs
                ids = [str(uuid.uuid4()) for _ in range(len(chunks))]
                
                # Add to collection
                collection.add(
                    documents=chunks,
                    embeddings=embeddings.tolist(),
                    ids=ids,
                    metadatas=[{"source": "demo", "index": i} for i in range(len(chunks))]
                )
                
                # Get collection info
                st.success(f"Successfully added {len(chunks)} documents to collection '{collection_name}'")
                
                # Show collections
                collections = client.list_collections()
                st.write("Available collections:")
                for coll in collections:
                    st.write(f"- {coll.name}")
                
                # Show count
                count = len(collection.get()["ids"])
                st.metric("Total documents in collection", count)
                
            except Exception as e:
                st.error(f"Error storing vectors: {str(e)}")
    
    # 4. Similarity Search
    with tab4:
        st.subheader("Similarity Search")
        
        # Query input
        query = st.text_input("Enter your query", "What is ChromaDB?")
        
        if query:
            with st.spinner("Searching for similar chunks..."):
                # Get collection
                collection = client.get_collection(name=collection_name)
                
                # Query
                results = collection.query(
                    query_texts=[query],
                    n_results=min(3, len(chunks))
                )
                
                # Display results
                st.write("Search results:")
                for i, (doc, distance) in enumerate(zip(results["documents"][0], results["distances"][0])):
                    st.write(f"**Result {i+1}** (Distance: {distance:.4f})")
                    st.text_area(f"Content {i+1}", doc, height=100)
                
                # Visualize distances
                if results["distances"] and len(results["distances"][0]) > 0:
                    distance_df = pd.DataFrame({
                        "Result": [f"Result {i+1}" for i in range(len(results["distances"][0]))],
                        "Similarity": [1 - d for d in results["distances"][0]]  # Convert distance to similarity
                    })
                    st.write("Similarity scores:")
                    st.bar_chart(distance_df.set_index("Result"))

# Instructions
st.sidebar.markdown("---")
st.sidebar.markdown("""
### How to use:
1. Enter document text or use the sample
2. Adjust chunking parameters
3. Click "Process Document"
4. Navigate through tabs to see each step
""")

if __name__ == "__main__":
    # This will be executed when the script is run directly
    pass 