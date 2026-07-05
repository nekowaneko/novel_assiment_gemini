"""
檔案監控服務：使用 watchdog 監控指定目錄中的檔案異動，
自動觸發文件處理與 RAG 匯入。
"""
import os
from typing import Callable, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileModifiedEvent

from .document_processor import SUPPORTED_EXTENSIONS


class ProjectFileHandler(FileSystemEventHandler):
    """
    處理檔案系統事件的 Handler。
    當偵測到支援格式的檔案被建立或修改時，觸發回呼函式。
    """

    def __init__(self, on_file_changed: Callable[[str], None]):
        """
        Args:
            on_file_changed: 檔案變更時的回呼函式，參數為檔案路徑。
        """
        super().__init__()
        self.on_file_changed = on_file_changed

    def _is_supported(self, path: str) -> bool:
        """檢查檔案是否為支援的格式。"""
        ext = os.path.splitext(path)[1].lower()
        return ext in SUPPORTED_EXTENSIONS

    def on_created(self, event):
        """檔案建立事件。"""
        if not event.is_directory and self._is_supported(event.src_path):
            self.on_file_changed(event.src_path)

    def on_modified(self, event):
        """檔案修改事件。"""
        if not event.is_directory and self._is_supported(event.src_path):
            self.on_file_changed(event.src_path)


class FileWatcher:
    """
    檔案監控器：啟動/停止對指定目錄的監控。
    """

    def __init__(self):
        self.observer: Optional[Observer] = None
        self.watch_path: Optional[str] = None

    def start(self, watch_path: str, on_file_changed: Callable[[str], None]):
        """
        開始監控指定目錄。

        Args:
            watch_path: 要監控的目錄路徑。
            on_file_changed: 檔案變更回呼。
        """
        if self.observer is not None:
            self.stop()

        if not os.path.isdir(watch_path):
            raise ValueError(f"監控路徑不存在或非目錄：{watch_path}")

        self.watch_path = watch_path
        handler = ProjectFileHandler(on_file_changed)
        self.observer = Observer()
        self.observer.schedule(handler, watch_path, recursive=True)
        self.observer.start()

    def stop(self):
        """停止監控。"""
        if self.observer is not None:
            self.observer.stop()
            self.observer.join()
            self.observer = None
            self.watch_path = None

    @property
    def is_running(self) -> bool:
        """監控器是否正在運行。"""
        return self.observer is not None and self.observer.is_alive()


# 單例實例
file_watcher = FileWatcher()
