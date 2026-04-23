import asyncio
import logging
from pathlib import Path
from typing import Dict
from backend.storage import StorageService

logger = logging.getLogger(__name__)


class DownloadFiles:
    def __init__(self, input_data: Dict):
        self.input_data = input_data
        self.model_id: str = input_data.get("model_id", "")
        self.user_id: str = input_data.get("user_id", "default")

    def _get_storage(self):
        return StorageService(self.user_id)

    def _download_file_sync(self, file: Dict) -> None:
        file_path = file.get("file_path", "")
        if not file_path:
            return

        local = Path(file_path)
        if local.exists():
            logger.debug("Cache hit — skipping download: %s", local)
            return

        filename = local.name
        logger.info("Cache miss — downloading from storage: %s", filename)

        local.parent.mkdir(parents=True, exist_ok=True)

        try:
            storage = self._get_storage()
            data = storage.download_file(self.model_id, "input", filename)
            local.write_bytes(data)
            logger.info("Saved to local cache: %s", local)
        except Exception as exc:
            logger.error(
                "Failed to download %s from storage: %s", filename, exc
            )
            raise

    async def _download_file(self, file: Dict) -> None:
        await asyncio.to_thread(self._download_file_sync, file)


    async def download_all_files(self) -> None:
        files_data = self.input_data.get("files_data") or []
        logger.info(
            "Ensuring %d file(s) are in local cache for model_id=%s",
            len(files_data),
            self.model_id,
        )
        tasks = [self._download_file(f) for f in files_data]
        await asyncio.gather(*tasks)
        logger.info("All files ready in local cache for model_id=%s", self.model_id)
