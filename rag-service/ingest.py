import os
import glob
import chromadb
from chromadb.utils import embedding_functions

# Initialize ChromaDB persistent client
DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
client = chromadb.PersistentClient(path=DB_PATH)

# Use default embedding function (SentenceTransformer all-MiniLM-L6-v2)
default_ef = embedding_functions.DefaultEmbeddingFunction()
collection = client.get_or_create_collection(name="stadium_sops", embedding_function=default_ef)

def chunk_text(text, chunk_size=1000, overlap=200):
    """
    Splits text into chunks of roughly chunk_size characters with overlap.
    Tries to split on paragraph boundaries (double newlines) if possible.
    """
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # If adding this paragraph exceeds chunk_size, save current chunk and start new
        if len(current_chunk) + len(para) + 2 > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            
            # If the single paragraph itself is larger than chunk_size, split by characters
            if len(para) > chunk_size:
                start = 0
                while start < len(para):
                    end = start + chunk_size
                    chunks.append(para[start:end])
                    start += chunk_size - overlap
                current_chunk = ""
            else:
                # Start new chunk with overlap from the previous one if possible
                overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                current_chunk = overlap_text + "\n\n" + para if overlap_text else para
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
                
    if current_chunk:
        chunks.append(current_chunk.strip())
        
    return chunks

def ingest_documents():
    docs_dir = os.path.join(os.path.dirname(__file__), "docs")
    search_path = os.path.join(docs_dir, "*.md")
    md_files = glob.glob(search_path)
    
    if not md_files:
        print(f"No markdown files found in {docs_dir}")
        return
        
    # Clear existing documents to avoid duplicates
    existing_count = collection.count()
    if existing_count > 0:
        print(f"Clearing {existing_count} existing documents from the collection...")
        # Get all IDs and delete
        all_docs = collection.get()
        if all_docs and all_docs.get("ids"):
            collection.delete(ids=all_docs["ids"])

    documents = []
    metadatas = []
    ids = []
    
    chunk_index = 0
    for file_path in md_files:
        filename = os.path.basename(file_path)
        print(f"Processing {filename}...")
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        chunks = chunk_text(content)
        print(f"Generated {len(chunks)} chunks for {filename}")
        
        for i, chunk in enumerate(chunks):
            documents.append(chunk)
            metadatas.append({"source": filename, "chunk_id": i})
            ids.append(f"{filename}_chunk_{i}")
            chunk_index += 1
            
    # Batch add to Chroma
    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Successfully ingested {len(documents)} chunks into ChromaDB.")
    else:
        print("No content to ingest.")

if __name__ == "__main__":
    ingest_documents()
