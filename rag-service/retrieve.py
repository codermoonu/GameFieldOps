import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions

app = FastAPI(title="GameField Ops RAG Service")

# Enable CORS for communication from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to ChromaDB
DB_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
client = chromadb.PersistentClient(path=DB_PATH)

# Use default embedding function
default_ef = embedding_functions.DefaultEmbeddingFunction()
collection = client.get_or_create_collection(name="stadium_sops", embedding_function=default_ef)

class RetrieveRequest(BaseModel):
    query: str
    k: int = 3

class RetrieveResponse(BaseModel):
    chunks: list[str]

@app.post("/retrieve", response_model=RetrieveResponse)
async def retrieve_context(payload: RetrieveRequest):
    try:
        # Check if collection is empty
        if collection.count() == 0:
            return RetrieveResponse(chunks=[])
            
        results = collection.query(
            query_texts=[payload.query],
            n_results=payload.k
        )
        
        # Flatten documents list
        chunks = []
        if results and "documents" in results and results["documents"]:
            # results["documents"] is a list of lists, i.e., [[chunk1, chunk2, ...]]
            chunks = results["documents"][0]
            
        return RetrieveResponse(chunks=chunks)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok", "document_count": collection.count()}

if __name__ == "__main__":
    uvicorn.run("retrieve:app", host="127.0.0.1", port=8000, reload=True)
