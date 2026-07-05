from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Optional
from ..rag.chroma_service import chroma_service
from ..llm.gemini_client import gemini_client
from ..services.document_processor import document_processor

router = APIRouter()

class AnalysisRequest(BaseModel):
    text: str
    history: List[Dict] = []

class IngestRequest(BaseModel):
    documents: List[str]

class ReaderRequest(BaseModel):
    text: str

class ApiKeyRequest(BaseModel):
    api_key: str

@router.post("/ingest")
async def ingest_documents(request: IngestRequest):
    try:
        # The original code expected request.metadatas, but the new IngestRequest model does not include it.
        # This part of the code will now raise an AttributeError if metadatas is accessed.
        # Assuming the intent is to remove metadata handling for this endpoint or it will be handled differently.
        # If metadatas are still needed, the IngestRequest model should be updated to include them.
        # For now, faithfully applying the model change as provided.
        # if not request.metadatas:
        #     request.metadatas = [{"source": "upload"} for _ in request.documents]
            
        chroma_service.add_documents(request.documents, [{"source": "upload"} for _ in request.documents]) # Default metadata if not provided
        return {"status": "success", "count": len(request.documents)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_text(request: AnalysisRequest): # Changed to AnalysisRequest as per instruction
    try:
        # 1. Retrieve context
        context_docs = chroma_service.query(request.text, n_results=3)
        context_str = "\n\n".join(context_docs) if context_docs else "No relevant context found."
        
        # 2. Generate response using RAG + LLM
        # Use generator to stream response
        # For simplicity in this endpoint, we might just return the full text or stream it.
        # fastAPI supports StreamingResponse. Let's implementing streaming.
        
        from fastapi.responses import StreamingResponse
        
        def iter_response():
            generator = gemini_client.get_scriptwriter_response(
                history=request.history,
                new_message=request.text,
                context=context_str
            )
            for chunk in generator:
                yield chunk

        return StreamingResponse(iter_response(), media_type="text/plain")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest-file")
async def ingest_file(file: UploadFile = File(...)):
    """
    接收上傳的檔案，使用 MarkItDown 轉換為 Markdown，
    切分後匯入 ChromaDB 知識庫。
    """
    try:
        content = await file.read()
        markdown_text = document_processor.convert_bytes(content, file.filename)
        chunks = document_processor.split_into_chunks(markdown_text)

        if not chunks:
            return {"status": "warning", "message": "檔案內容為空，未匯入任何資料。"}

        metadatas = [
            {"source": file.filename, "chunk_index": i, "total_chunks": len(chunks)}
            for i in range(len(chunks))
        ]

        chroma_service.add_documents(chunks, metadatas)
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_ingested": len(chunks),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reader")
async def reader_analyze(request: ReaderRequest):
    """
    Reader AI Analysis Endpoint.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    response = gemini_client.get_reader_response(request.text)
    return {"analysis": response}

@router.post("/config/api-key")
async def set_api_key(request: ApiKeyRequest):
    """
    Set Gemini API Key.
    """
    if not request.api_key.strip():
        raise HTTPException(status_code=400, detail="API Key cannot be empty")
        
    gemini_client.update_api_key(request.api_key)
    return {"status": "success", "message": "API Key updated"}

@router.get("/config/api-key/status")
async def get_api_key_status():
    """
    Check if API Key is configured.
    """
    is_set = gemini_client.get_api_key_status()
    return {"is_configured": is_set}

