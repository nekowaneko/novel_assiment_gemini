"""
聊天相關 Pydantic 模型
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class ReaderChatRequest(BaseModel):
    """讀者 AI 請求模型"""
    text: str = Field(..., description="要分析的小說文字片段")
    

class ReaderChatResponse(BaseModel):
    """讀者 AI 回應模型"""
    analysis: str = Field(..., description="AI 的讀後評價")


class ScreenwriterChatRequest(BaseModel):
    """編劇 AI 請求模型"""
    message: str = Field(..., description="使用者輸入的訊息")
    history: List[Dict] = Field(default_factory=list, description="對話歷史")
    knowledge_base_names: List[str] = Field(default_factory=list, description="選擇的知識庫名稱")


class ScreenwriterChatResponse(BaseModel):
    """編劇 AI 回應模型 (非串流)"""
    reply: str = Field(..., description="AI 的回覆")


class KnowledgeBaseItem(BaseModel):
    """知識庫項目"""
    name: str
    

class KnowledgeBaseListResponse(BaseModel):
    """知識庫列表回應"""
    knowledge_bases: List[KnowledgeBaseItem]
