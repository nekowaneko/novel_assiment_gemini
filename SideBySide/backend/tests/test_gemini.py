
import pytest
from unittest.mock import MagicMock, patch
from app.llm.gemini_client import GeminiClient

@pytest.fixture
def mock_genai():
    with patch('app.llm.gemini_client.genai') as mock:
        yield mock

def test_generate_content(mock_genai):
    # Setup mock
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Mock response"
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    client = GeminiClient()
    response = client.generate_content("test prompt")
    
    assert response == "Mock response"
    mock_model.generate_content.assert_called_with("test prompt")

def test_scriptwriter_response(mock_genai):
    # Setup mock for chat
    mock_model = MagicMock()
    mock_chat = MagicMock()
    mock_chunk = MagicMock()
    mock_chunk.text = "Chunk 1"
    
    mock_chat.send_message.return_value = [mock_chunk]
    mock_model.start_chat.return_value = mock_chat
    mock_genai.GenerativeModel.return_value = mock_model
    
    client = GeminiClient()
    generator = client.get_scriptwriter_response([], "new message", "context")
    
    results = list(generator)
    assert len(results) == 1
    assert results[0] == "Chunk 1"
