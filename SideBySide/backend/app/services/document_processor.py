"""
文件處理服務：使用 Microsoft MarkItDown 將多種格式的檔案轉換為 Markdown，
然後切分成適合 RAG 匯入的文字區塊。
"""
import os
import tempfile
from typing import List, Dict
from markitdown import MarkItDown

# 支援的檔案副檔名
SUPPORTED_EXTENSIONS = {".docx", ".pdf", ".xlsx", ".pptx", ".html", ".csv", ".txt", ".md"}


class DocumentProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """
        初始化文件處理器。

        Args:
            chunk_size: 每個文字區塊的最大字元數。
            chunk_overlap: 相鄰區塊之間的重疊字元數，確保上下文連續性。
        """
        self.converter = MarkItDown()
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def convert_file(self, file_path: str) -> str:
        """
        將檔案轉換為 Markdown 純文字。

        Args:
            file_path: 檔案的絕對路徑。

        Returns:
            轉換後的 Markdown 文字內容。

        Raises:
            ValueError: 不支援的檔案格式。
            FileNotFoundError: 檔案不存在。
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"檔案不存在：{file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"不支援的檔案格式：{ext}。支援的格式：{SUPPORTED_EXTENSIONS}")

        result = self.converter.convert(file_path)
        return result.text_content

    def convert_bytes(self, content: bytes, filename: str) -> str:
        """
        將上傳的二進位檔案內容轉換為 Markdown。
        用於處理 FastAPI UploadFile。

        Args:
            content: 檔案二進位內容。
            filename: 原始檔案名稱（用於判斷格式）。

        Returns:
            轉換後的 Markdown 文字內容。
        """
        ext = os.path.splitext(filename)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"不支援的檔案格式：{ext}")

        # 寫入臨時檔案供 MarkItDown 處理
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            result = self.converter.convert(tmp_path)
            return result.text_content
        finally:
            os.unlink(tmp_path)

    def split_into_chunks(self, text: str) -> List[str]:
        """
        將文字切分成固定大小的區塊，並保留重疊部分以維持上下文。

        Args:
            text: 要切分的文字。

        Returns:
            文字區塊列表。
        """
        if not text or not text.strip():
            return []

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + self.chunk_size

            # 嘗試在句尾或段落結尾切分，避免斷句
            if end < text_len:
                # 向前搜尋最近的換行符或句號
                for sep in ["\n\n", "\n", "。", ".", "！", "!", "？", "?"]:
                    last_sep = text.rfind(sep, start, end)
                    if last_sep > start:
                        end = last_sep + len(sep)
                        break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # 下一個區塊的起點 = 當前結束點 - 重疊量
            start = end - self.chunk_overlap if end < text_len else text_len

        return chunks

    def process_file(self, file_path: str) -> Dict:
        """
        完整處理流程：轉換 + 切分。

        Args:
            file_path: 檔案路徑。

        Returns:
            包含 chunks 和 metadata 的字典。
        """
        markdown_text = self.convert_file(file_path)
        chunks = self.split_into_chunks(markdown_text)
        filename = os.path.basename(file_path)

        metadatas = [
            {"source": filename, "chunk_index": i, "total_chunks": len(chunks)}
            for i in range(len(chunks))
        ]

        return {"chunks": chunks, "metadatas": metadatas}


# 單例實例
document_processor = DocumentProcessor()
