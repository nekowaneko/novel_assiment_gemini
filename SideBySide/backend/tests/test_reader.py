from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

def test_reader_analyze_success():
    with patch('app.llm.gemini_client.gemini_client.get_reader_response') as mock_reader:
        mock_reader.return_value = "Mock Reader Feedback"
        
        response = client.post("/api/reader", json={"text": "Novel snippet"})
        assert response.status_code == 200
        assert response.json()["analysis"] == "Mock Reader Feedback"
        mock_reader.assert_called_once_with("Novel snippet")

def test_reader_analyze_empty():
    response = client.post("/api/reader", json={"text": "   "})
    assert response.status_code == 400
