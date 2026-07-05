
import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Optional

class ChromaService:
    def __init__(self, persist_directory: str = "chroma_db"):
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection = self.client.get_or_create_collection(name="novel_context")

    def add_documents(self, documents: List[str], metadatas: List[Dict]):
        """
        Add documents to the ChromaDB collection.
        """
        if not documents:
            return
            
        # Generate IDs based on content hash or simple index for now
        ids = [str(hash(doc)) for doc in documents]
        
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    def query(self, query_text: str, n_results: int = 3) -> List[str]:
        """
        Query the collection for relevant documents.
        """
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        
        # Flatten results
        if results and results['documents']:
            return results['documents'][0]
        return []

# Singleton instance
chroma_service = ChromaService()
