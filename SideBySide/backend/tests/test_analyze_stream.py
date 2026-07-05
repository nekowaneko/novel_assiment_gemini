"""
/api/analyze 串流行為測試。

驗證重點（postmortem 教訓：驗證資料內容，不只驗證有呼叫）：
1. 端點以 StreamingResponse 逐塊輸出 Gemini 生成內容。
2. RAG 檢索結果有確實組進 context 傳給 gemini_client。
3. 檢索階段例外時回傳 HTTP 500 與 detail。
"""
from typing import Dict, Generator, List

import pytest
from fastapi.testclient import TestClient

from app.api import endpoints
from app.main import app

client = TestClient(app)


@pytest.fixture
def fake_rag(monkeypatch):
    """把 ChromaDB 檢索換成固定結果，避免測試依賴本地向量庫。"""
    monkeypatch.setattr(
        endpoints.chroma_service,
        "query",
        lambda text, n_results=3: ["主角是一位劍士", "背景設定在江戶時代"],
    )


def test_analyze_streams_chunks(monkeypatch, fake_rag):
    """生成器 yield 的每一塊都應依序出現在串流回應中。"""
    yielded = ["建議一：", "強化主角動機。", "建議二：加入伏筆。"]

    def fake_scriptwriter(
        history: List[Dict], new_message: str, context: str
    ) -> Generator[str, None, None]:
        yield from yielded

    monkeypatch.setattr(
        endpoints.gemini_client, "get_scriptwriter_response", fake_scriptwriter
    )

    with client.stream(
        "POST", "/api/analyze", json={"text": "主角接下來該做什麼？", "history": []}
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/plain")
        chunks = list(response.iter_text())

    # 資料完整性：串流內容組合後 === 生成器輸出總和
    assert "".join(chunks) == "".join(yielded)


def test_analyze_passes_rag_context_to_gemini(monkeypatch, fake_rag):
    """檢索到的文件應以雙換行串接後傳入 gemini_client 的 context 參數。"""
    captured = {}

    def fake_scriptwriter(
        history: List[Dict], new_message: str, context: str
    ) -> Generator[str, None, None]:
        captured["history"] = history
        captured["new_message"] = new_message
        captured["context"] = context
        yield "ok"

    monkeypatch.setattr(
        endpoints.gemini_client, "get_scriptwriter_response", fake_scriptwriter
    )

    history = [{"role": "user", "content": "先前的討論"}]
    with client.stream(
        "POST", "/api/analyze", json={"text": "測試輸入", "history": history}
    ) as response:
        list(response.iter_text())  # 消費完串流，確保生成器被執行

    assert captured["new_message"] == "測試輸入"
    assert captured["history"] == history
    assert captured["context"] == "主角是一位劍士\n\n背景設定在江戶時代"


def test_analyze_returns_500_when_retrieval_fails(monkeypatch):
    """檢索階段（串流開始前）出錯應回傳 HTTP 500，detail 帶錯誤訊息。"""

    def broken_query(text, n_results=3):
        raise RuntimeError("ChromaDB 連線失敗")

    monkeypatch.setattr(endpoints.chroma_service, "query", broken_query)

    response = client.post("/api/analyze", json={"text": "測試", "history": []})
    assert response.status_code == 500
    assert "ChromaDB 連線失敗" in response.json()["detail"]
