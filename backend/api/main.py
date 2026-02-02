"""
FastAPI 應用程式入口
"""

import os
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 將專案根目錄加入路徑，以便 import src.utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 載入環境變數
load_dotenv()

from api.routes import chat, knowledge, files


@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    # 啟動時執行
    print("[FastAPI] 啟動中...")
    yield
    # 關閉時執行
    print("[FastAPI] 關閉中...")


app = FastAPI(
    title="AI 寫作伴侶 API",
    description="提供編劇 AI、讀者 AI 與知識庫管理功能",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 設定：允許 Next.js 前端存取
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js 開發伺服器
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(chat.router, prefix="/api/chat", tags=["聊天"])
app.include_router(knowledge.router, prefix="/api/knowledge-bases", tags=["知識庫"])
app.include_router(files.router, prefix="/api/files", tags=["檔案"])


@app.get("/api/health")
async def health_check():
    """健康檢查端點"""
    return {"status": "ok", "message": "AI 寫作伴侶 API 運行中"}
