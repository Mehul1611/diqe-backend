import logging
import shutil
from typing import List

logger = logging.getLogger(__name__)


def clean_specific_folders(base_path: str, folders: List[str]) -> None:
    if not base_path.exists():
        logger.warning("Base path does not exist: %s", base_path)
        return

    for folder_name in folders:
        folder_path = base_path / folder_name
        if folder_path.exists() and folder_path.is_dir():
            try:
                shutil.rmtree(folder_path)
                logger.info("Deleted folder: %s", folder_path)
            except Exception as e:
                logger.error("Failed to delete folder %s: %s", folder_path, e)
        else:
            logger.info("Folder not found or already deleted: %s", folder_path)
