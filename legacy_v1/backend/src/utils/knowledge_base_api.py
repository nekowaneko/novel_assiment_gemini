"""
知識庫 API 適配層
將 FastAPI UploadFile 轉換為現有知識庫函式可接受的格式
"""

import os
import shutil
import time
from typing import List
from fastapi import UploadFile
from langchain_community.document_loaders import UnstructuredFileLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from src.utils.knowledge_base import get_persist_directory

KB_DIR = get_persist_directory()


async def create_knowledge_base_from_files(
    files: List[UploadFile],
    kb_name: str,
    api_key: str
) -> dict:
    """
    從 FastAPI UploadFile 建立向量資料庫。
    
    Args:
        files: FastAPI UploadFile 列表
        kb_name: 知識庫名稱
        api_key: HuggingFace API 金鑰
    
    Returns:
        dict: 包含建立結果的字典
    """
    temp_dir = "./temp_docs_api"
    persist_dir = os.path.join(KB_DIR, kb_name)
    
    if not api_key:
        raise ValueError("HuggingFace API Key 未提供")
    
    # 確保目錄存在
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(KB_DIR, exist_ok=True)
    
    documents = []
    
    try:
        # 儲存上傳的檔案到臨時目錄
        for file in files:
            file_path = os.path.join(temp_dir, file.filename or "unknown")
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # 載入文件
            loader = UnstructuredFileLoader(file_path)
            documents.extend(loader.load())
        
        if not documents:
            raise ValueError("無法從上傳的檔案中讀取任何內容")
        
        # 分割文件
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=200
        )
        docs = text_splitter.split_documents(documents)
        
        # 建立 Embeddings
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # 批次建立向量資料庫
        batch_size = 50
        vector_store = None
        
        for i in range(0, len(docs), batch_size):
            batch = docs[i:i + batch_size]
            if i == 0:
                vector_store = Chroma.from_documents(
                    batch, 
                    embeddings, 
                    persist_directory=persist_dir
                )
            else:
                vector_store.add_documents(batch)
            
            # 避免 API 限流
            time.sleep(0.5)
        
        return {
            "status": "success",
            "document_count": len(docs),
            "kb_name": kb_name
        }
    
    finally:
        # 清理臨時目錄
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
