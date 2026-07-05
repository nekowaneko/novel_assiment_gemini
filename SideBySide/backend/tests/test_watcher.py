"""
測試檔案監控器：驗證 watchdog 事件觸發處理回呼。
"""
import pytest
from unittest.mock import MagicMock, patch, call
from watchdog.events import FileCreatedEvent, FileModifiedEvent, DirCreatedEvent

from app.services.file_watcher import ProjectFileHandler, FileWatcher


class TestProjectFileHandler:
    """測試檔案事件處理器。"""

    def test_on_created_supported_file(self):
        """建立支援格式的檔案應觸發回呼。"""
        callback = MagicMock()
        handler = ProjectFileHandler(on_file_changed=callback)

        event = FileCreatedEvent(src_path="/project/chapter1.docx")
        handler.on_created(event)

        callback.assert_called_once_with("/project/chapter1.docx")

    def test_on_created_unsupported_file(self):
        """建立不支援格式的檔案不應觸發回呼。"""
        callback = MagicMock()
        handler = ProjectFileHandler(on_file_changed=callback)

        event = FileCreatedEvent(src_path="/project/image.png")
        handler.on_created(event)

        callback.assert_not_called()

    def test_on_modified_supported_file(self):
        """修改支援格式的檔案應觸發回呼。"""
        callback = MagicMock()
        handler = ProjectFileHandler(on_file_changed=callback)

        event = FileModifiedEvent(src_path="/project/timeline.xlsx")
        handler.on_modified(event)

        callback.assert_called_once_with("/project/timeline.xlsx")

    def test_on_created_directory_ignored(self):
        """目錄事件不應觸發回呼。"""
        callback = MagicMock()
        handler = ProjectFileHandler(on_file_changed=callback)

        event = DirCreatedEvent(src_path="/project/new_folder")
        handler.on_created(event)

        callback.assert_not_called()

    def test_multiple_supported_formats(self):
        """測試多種支援格式。"""
        callback = MagicMock()
        handler = ProjectFileHandler(on_file_changed=callback)

        supported_files = [
            "/project/doc.docx",
            "/project/data.pdf",
            "/project/sheet.xlsx",
            "/project/slides.pptx",
            "/project/page.html",
            "/project/notes.txt",
        ]

        for f in supported_files:
            event = FileCreatedEvent(src_path=f)
            handler.on_created(event)

        assert callback.call_count == len(supported_files)


class TestFileWatcher:
    """測試檔案監控器啟停邏輯。"""

    @patch('app.services.file_watcher.Observer')
    def test_start_watcher(self, mock_observer_cls):
        """測試啟動監控器。"""
        mock_observer = MagicMock()
        mock_observer_cls.return_value = mock_observer

        watcher = FileWatcher()
        with patch('os.path.isdir', return_value=True):
            watcher.start("/fake/path", on_file_changed=MagicMock())

        mock_observer.schedule.assert_called_once()
        mock_observer.start.assert_called_once()

    @patch('app.services.file_watcher.Observer')
    def test_stop_watcher(self, mock_observer_cls):
        """測試停止監控器。"""
        mock_observer = MagicMock()
        mock_observer_cls.return_value = mock_observer

        watcher = FileWatcher()
        with patch('os.path.isdir', return_value=True):
            watcher.start("/fake/path", on_file_changed=MagicMock())

        watcher.stop()
        mock_observer.stop.assert_called_once()
        mock_observer.join.assert_called_once()
        assert watcher.observer is None
