import os

from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.llm.gemini_client import gemini_client

client = TestClient(app)

def test_set_api_key():
    with patch('app.llm.gemini_client.gemini_client.update_api_key') as mock_update:
        response = client.post("/api/config/api-key", json={"api_key": "new_key"})
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        mock_update.assert_called_once_with("new_key")

def test_set_api_key_empty():
    response = client.post("/api/config/api-key", json={"api_key": ""})
    assert response.status_code == 400

def test_get_api_key_status_true():
    with patch('app.llm.gemini_client.gemini_client.get_api_key_status') as mock_status:
        mock_status.return_value = True
        response = client.get("/api/config/api-key/status")
        assert response.status_code == 200
        assert response.json()["is_configured"] is True

def test_get_api_key_status_false():
    with patch('app.llm.gemini_client.gemini_client.get_api_key_status') as mock_status:
        mock_status.return_value = False
        response = client.get("/api/config/api-key/status")
        assert response.status_code == 200
        assert response.json()["is_configured"] is False


def test_update_api_key_dedupes_bom_env(tmp_path, monkeypatch):
    """帶 BOM 且有重複 GEMINI_API_KEY 行的 .env 應被重寫為乾淨的單一行。

    回歸案例：BOM 使 startswith 比對失敗，每次儲存都追加重複行，
    導致啟動時載入到空的舊行而要求重新輸入 key。
    """
    monkeypatch.setenv("GEMINI_API_KEY", "old-key")
    env_file = tmp_path / ".env"
    env_file.write_bytes(
        "\ufeffGEMINI_API_KEY=\nGEMINI_API_KEY=stale\nOTHER_VAR=keep\n".encode("utf-8")
    )

    gemini_client.update_api_key("fresh-key", env_path=str(env_file))

    raw = env_file.read_bytes()
    assert not raw.startswith(b"\xef\xbb\xbf"), "重寫後不應帶 BOM"
    text = raw.decode("utf-8")
    assert text.count("GEMINI_API_KEY=") == 1, "GEMINI_API_KEY 應只剩一行"
    assert "GEMINI_API_KEY=fresh-key\n" in text
    assert "OTHER_VAR=keep" in text, "其他變數應保留"
    assert os.getenv("GEMINI_API_KEY") == "fresh-key"


def test_update_api_key_creates_env_when_missing(tmp_path, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "old-key")
    env_file = tmp_path / ".env"

    gemini_client.update_api_key("brand-new-key", env_path=str(env_file))

    assert env_file.read_text(encoding="utf-8") == "GEMINI_API_KEY=brand-new-key\n"
