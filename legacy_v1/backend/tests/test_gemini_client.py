import pytest
from unittest.mock import MagicMock
from src.utils.gemini_client import get_reader_ai_response, get_scriptwriter_ai_response

def test_get_reader_ai_response_success(mocker):
    # Mock genai.GenerativeModel
    mock_model = mocker.patch("google.generativeai.GenerativeModel")
    mock_instance = mock_model.return_value
    mock_response = MagicMock()
    mock_response.text = "This is a great story."
    mock_instance.generate_content.return_value = mock_response
    
    # Mock genai.configure
    mocker.patch("google.generativeai.configure")
    
    response = get_reader_ai_response("Once upon a time...", "fake_key")
    
    assert response == "This is a great story."
    mock_instance.generate_content.assert_called_once()
    # Verify prompt contains excerpt
    args, _ = mock_instance.generate_content.call_args
    assert "Once upon a time..." in args[0]

def test_get_reader_ai_response_error(mocker):
    mocker.patch("google.generativeai.configure")
    mock_model = mocker.patch("google.generativeai.GenerativeModel")
    mock_instance = mock_model.return_value
    mock_instance.generate_content.side_effect = Exception("API Error")
    
    response = get_reader_ai_response("Excerpt", "fake_key")
    assert "讀者 AI 服務發生錯誤" in response

def test_get_scriptwriter_ai_response_success(mocker):
    mocker.patch("google.generativeai.configure")
    mock_model = mocker.patch("google.generativeai.GenerativeModel")
    mock_instance = mock_model.return_value
    
    mock_chat = MagicMock()
    mock_instance.start_chat.return_value = mock_chat
    
    # Mock stream response
    mock_chunk1 = MagicMock()
    mock_chunk1.text = "Part 1 "
    mock_chunk2 = MagicMock()
    mock_chunk2.text = "Part 2"
    mock_chat.send_message.return_value = [mock_chunk1, mock_chunk2]
    
    generator = get_scriptwriter_ai_response([], "Hello", "Some context", "fake_key")
    results = list(generator)
    
    assert results == ["Part 1 ", "Part 2"]
    mock_chat.send_message.assert_called_once()
    args, _ = mock_chat.send_message.call_args
    assert "Some context" in args[0]
    assert "Hello" in args[0]
