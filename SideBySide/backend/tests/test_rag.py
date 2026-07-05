
import pytest
from unittest.mock import MagicMock, patch
from app.rag.chroma_service import ChromaService

@pytest.fixture
def mock_chromadb():
    with patch('app.rag.chroma_service.chromadb') as mock:
        yield mock

def test_add_documents(mock_chromadb):
    mock_client = MagicMock()
    mock_collection = MagicMock()
    mock_client.get_or_create_collection.return_value = mock_collection
    mock_chromadb.PersistentClient.return_value = mock_client
    
    service = ChromaService()
    service.add_documents(["doc1"], [{"source": "test"}])
    
    mock_collection.add.assert_called_once()
    args, kwargs = mock_collection.add.call_args
    assert kwargs['documents'] == ["doc1"]
    assert kwargs['metadatas'] == [{"source": "test"}]

def test_query(mock_chromadb):
    mock_client = MagicMock()
    mock_collection = MagicMock()
    
    # Mock query result
    mock_collection.query.return_value = {
        'documents': [["result1", "result2"]]
    }
    
    mock_client.get_or_create_collection.return_value = mock_collection
    mock_chromadb.PersistentClient.return_value = mock_client
    
    service = ChromaService()
    results = service.query("test query")
    
    assert results == ["result1", "result2"]
    mock_collection.query.assert_called_once()
