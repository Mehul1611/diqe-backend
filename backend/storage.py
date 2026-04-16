import logging
import os
from functools import lru_cache
from supabase import create_client, Client

logger = logging.getLogger(__name__)

BUCKET = "diqe-models"


@lru_cache(maxsize=1)
def _get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    return create_client(url, key)


class StorageService:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self._sb = _get_supabase()

    def _object_path(self, model_id: str, subfolder: str, filename: str) -> str:
        return f"users/{self.user_id}/{model_id}/{subfolder}/{filename}"

    def _prefix(self, model_id: str, subfolder: str) -> str:
        return f"users/{self.user_id}/{model_id}/{subfolder}"

    def upload_file(self, model_id: str, subfolder: str, filename: str, data: bytes) -> None:
        path = self._object_path(model_id, subfolder, filename)
        try:
            self._sb.storage.from_(BUCKET).upload(
                path=path,
                file=data,
                file_options={"upsert": "true"},
            )
            logger.info("Uploaded to storage: %s", path)
        except Exception as exc:
            logger.error("Storage upload failed for %s: %s", path, exc)
            raise

    def download_file(self, model_id: str, subfolder: str, filename: str) -> bytes:
        path = self._object_path(model_id, subfolder, filename)
        try:
            data: bytes = self._sb.storage.from_(BUCKET).download(path)
            logger.info("Downloaded from storage: %s", path)
            return data
        except Exception as exc:
            logger.error("Storage download failed for %s: %s", path, exc)
            raise

    def list_files(self, model_id: str, subfolder: str) -> list[dict]:
        prefix = self._prefix(model_id, subfolder)
        try:
            result = self._sb.storage.from_(BUCKET).list(prefix)
            return result or []
        except Exception as exc:
            logger.error("Storage list failed for %s: %s", prefix, exc)
            return []

    def delete_model(self, model_id: str) -> None:
        for subfolder in ("input", "output"):
            prefix = self._prefix(model_id, subfolder)
            try:
                files = self._sb.storage.from_(BUCKET).list(prefix)
                if files:
                    paths = [f"{prefix}/{f['name']}" for f in files if f.get("name")]
                    if paths:
                        self._sb.storage.from_(BUCKET).remove(paths)
                        logger.info("Deleted %d file(s) from %s", len(paths), prefix)
            except Exception as exc:
                logger.error("Failed to delete storage prefix %s: %s", prefix, exc)
