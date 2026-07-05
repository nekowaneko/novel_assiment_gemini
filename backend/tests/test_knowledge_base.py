import pytest
from unittest.mock import MagicMock
from src.utils.knowledge_base import get_relevant_context

def test_get_relevant_context():
    # Mock Chroma vector stores
    mock_vs1 = MagicMock()
    doc1 = MagicMock()
    doc1.page_content = "Content from store 1"
    mock_vs1.similarity_search.return_value = [doc1]
    
    mock_vs2 = MagicMock()
    doc2 = MagicMock()
    doc2.page_content = "Content from store 2"
    mock_vs2.similarity_search.return_value = [doc2]
    
    context = get_relevant_context([mock_vs1, mock_vs2], "query")
    
    assert "Content from store 1" in context
    assert "Content from store 2" in context
    assert "相關上下文資料" in context
    
    mock_vs1.similarity_search.assert_called_once_with("query")
    mock_vs2.similarity_search.assert_called_once_with("query")

def test_get_relevant_context_empty():
    context = get_relevant_context([], "query")
    assert context == "相關上下文資料：\n"
