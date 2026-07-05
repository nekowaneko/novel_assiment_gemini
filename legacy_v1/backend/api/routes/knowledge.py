"""
知識庫相關 API 端點
"""

import os
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from api.schemas.chat import KnowledgeBaseListResponse, KnowledgeBaseItem
from src.utils.knowledge_base import list_knowledge_bases
from src.utils.knowledge_base_api import create_knowledge_base_from_files

router = APIRouter()


@router.get("", response_model=KnowledgeBaseListResponse)
async def get_knowledge_bases():
    """
    列出所有知識庫
    
    回傳系統中已建立的所有知識庫名稱。
    """
    try:
        kb_names = list_knowledge_bases()
        items = [KnowledgeBaseItem(name=name) for name in kb_names]
        return KnowledgeBaseListResponse(knowledge_bases=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"無法取得知識庫列表：{str(e)}")


@router.post("")
async def create_knowledge_base(
    name: str = Form(..., description="知識庫名稱"),
    files: List[UploadFile] = File(..., description="上傳的文件檔案 (.docx, .txt)")
):
    """
    建立新知識庫
    
    接收使用者上傳的檔案，建立向量資料庫並持久化儲存。
    """
    hf_key = os.getenv("HUGGINGFACEHUB_API_TOKEN", "")
    
    if not hf_key:
        raise HTTPException(status_code=500, detail="HuggingFace API 金鑰未設定")
    
    if not name.strip():
        raise HTTPException(status_code=400, detail="請提供知識庫名稱")
    
    if not files:
        raise HTTPException(status_code=400, detail="請上傳至少一個檔案")
    
    # 檢查檔案格式
    allowed_extensions = {".docx", ".txt"}
    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"不支援的檔案格式：{file.filename}，僅支援 .docx, .txt"
            )
    
    try:
        result = await create_knowledge_base_from_files(
            files=files,
            kb_name=name.strip(),
            api_key=hf_key
        )
        return {
            "status": "success",
            "message": f"知識庫 '{name}' 建立成功",
            "document_count": result.get("document_count", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"建立知識庫失敗：{str(e)}")


@router.delete("/{name}")
async def delete_knowledge_base(name: str):
    """
    刪除知識庫
    
    移除指定名稱的知識庫及其所有資料。
    """
    import shutil
    from src.utils.knowledge_base import get_persist_directory
    
    kb_dir = get_persist_directory()
    kb_path = os.path.join(kb_dir, name)
    
    if not os.path.exists(kb_path):
        raise HTTPException(status_code=404, detail=f"知識庫 '{name}' 不存在")
    
    try:
        shutil.rmtree(kb_path)
        return {
            "status": "success",
            "message": f"知識庫 '{name}' 已刪除"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刪除知識庫失敗：{str(e)}")
