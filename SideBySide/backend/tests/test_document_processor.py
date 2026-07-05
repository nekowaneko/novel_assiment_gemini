"""
測試文件處理器：驗證 MarkItDown 轉換與文字切分邏輯。
"""
import pytest
from unittest.mock import MagicMock, patch
from app.services.document_processor import DocumentProcessor


@pytest.fixture
def processor():
    """建立一個測試用的 DocumentProcessor 實例。"""
    with patch('app.services.document_processor.MarkItDown') as mock_markitdown_cls:
        mock_instance = MagicMock()
        mock_markitdown_cls.return_value = mock_instance
        proc = DocumentProcessor(chunk_size=100, chunk_overlap=20)
        proc.converter = mock_instance
        yield proc, mock_instance


def test_convert_bytes(processor):
    """測試二進位檔案轉換為 Markdown。"""
    proc, mock_converter = processor

    mock_result = MagicMock()
    mock_result.text_content = "# 第一章\n\n這是一段測試文字。"
    mock_converter.convert.return_value = mock_result

    result = proc.convert_bytes(b"fake docx content", "test.docx")
    assert result == "# 第一章\n\n這是一段測試文字。"
    mock_converter.convert.assert_called_once()


def test_convert_bytes_unsupported_format(processor):
    """測試不支援的檔案格式應拋出 ValueError。"""
    proc, _ = processor

    with pytest.raises(ValueError, match="不支援的檔案格式"):
        proc.convert_bytes(b"content", "test.xyz")


def test_split_into_chunks():
    """測試文字切分邏輯。"""
    proc = DocumentProcessor(chunk_size=50, chunk_overlap=10)
    # 使用 patch 避免初始化時的 MarkItDown 呼叫問題
    proc.converter = MagicMock()

    text = "A" * 120  # 120 個字元
    chunks = proc.split_into_chunks(text)

    # 應至少切成 2 個以上的區塊
    assert len(chunks) >= 2
    # 每個區塊不超過 chunk_size
    for chunk in chunks:
        assert len(chunk) <= 50


def test_split_empty_text():
    """測試空文字應回傳空列表。"""
    proc = DocumentProcessor()
    proc.converter = MagicMock()

    assert proc.split_into_chunks("") == []
    assert proc.split_into_chunks("   ") == []


def test_process_file(processor):
    """測試完整處理流程。"""
    proc, mock_converter = processor

    mock_result = MagicMock()
    mock_result.text_content = "段落一。段落二。段落三。"
    mock_converter.convert.return_value = mock_result

    with patch('os.path.exists', return_value=True):
        result = proc.process_file("test.docx")

    assert "chunks" in result
    assert "metadatas" in result
    assert len(result["chunks"]) > 0
    assert result["metadatas"][0]["source"] == "test.docx"
