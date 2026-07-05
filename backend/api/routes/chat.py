"""
聊天相關 API 端點
- 讀者 AI：文字分析
- 編劇 AI：串流對話
"""

import os
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from api.schemas.chat import (
    ReaderChatRequest,
    ReaderChatResponse,
    ScreenwriterChatRequest,
)
from src.utils.gemini_client import get_reader_ai_response, get_scriptwriter_ai_response
from src.utils.knowledge_base import load_vector_store, get_relevant_context

router = APIRouter()


def get_api_keys() -> tuple[str, str]:
    """取得 API 金鑰"""
    gemini_key = os.getenv("GOOGLE_CLOULD_API_KEY", "")
    hf_key = os.getenv("HUGGINGFACEHUB_API_TOKEN", "")
    return gemini_key, hf_key


@router.post("/reader", response_model=ReaderChatResponse)
async def reader_ai_analyze(request: ReaderChatRequest):
    """
    讀者 AI 分析端點
    
    接收使用者選取的文字片段，回傳 AI 的讀後評價。
    """
    gemini_key, _ = get_api_keys()
    
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API 金鑰未設定")
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="請提供要分析的文字內容")
    
    try:
        analysis = get_reader_ai_response(request.text, gemini_key)
        return ReaderChatResponse(analysis=analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"讀者 AI 服務錯誤：{str(e)}")


async def generate_screenwriter_stream(
    message: str,
    history: list,
    context: str,
    api_key: str
) -> AsyncGenerator[str, None]:
    """產生編劇 AI 串流回應"""
    try:
        for chunk in get_scriptwriter_ai_response(history, message, context, api_key):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: [ERROR] {str(e)}\n\n"


@router.post("/screenwriter")
async def screenwriter_ai_chat(request: ScreenwriterChatRequest):
    """
    編劇 AI 對話端點 (SSE 串流)
    
    接收使用者訊息與對話歷史，回傳串流式 AI 回覆。
    支援 RAG 知識庫檢索。
    """
    gemini_key, hf_key = get_api_keys()
    
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API 金鑰未設定")
    
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="請輸入訊息")
    
    # RAG：從選擇的知識庫檢索相關內容
    context = ""
    if request.knowledge_base_names and hf_key:
        vector_stores = []
        for kb_name in request.knowledge_base_names:
            vs = load_vector_store(hf_key, kb_name)
            if vs:
                vector_stores.append(vs)
        
        if vector_stores:
            context = get_relevant_context(vector_stores, request.message)
    
    return StreamingResponse(
        generate_screenwriter_stream(
            request.message,
            request.history,
            context,
            gemini_key
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
