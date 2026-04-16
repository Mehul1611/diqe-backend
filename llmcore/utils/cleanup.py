import logging
import shutil
import time
from pathlib import Path

logger = logging.getLogger(__name__)


def cleanup_old_data(retention_hours: int = 24):
    repo_root = Path(__file__).resolve().parents[2]
    target_dirs = [repo_root / "models", repo_root / "output"]
    current_time = time.time()
    retention_seconds = retention_hours * 3600
    deleted_count = 0
    errors = []

    logger.info("Starting cleanup: retention=%d hours", retention_hours)

    for base_dir in target_dirs:
        if not base_dir.exists():
            continue
        logger.info("Checking directory: %s", base_dir)

        for user_dir in base_dir.iterdir():
            if not user_dir.is_dir():
                continue
            for model_dir in user_dir.iterdir():
                if not model_dir.is_dir():
                    continue
                last_modified = model_dir.stat().st_mtime
                age_seconds = current_time - last_modified
                if age_seconds > retention_seconds:
                    try:
                        logger.info(
                            "Deleting expired cache: %s (age=%.1f h)",
                            model_dir.name,
                            age_seconds / 3600,
                        )
                        shutil.rmtree(model_dir)
                        deleted_count += 1
                    except Exception as e:
                        errors.append(f"Failed to delete {model_dir}: {e}")
                        logger.error("Failed to delete %s: %s", model_dir, e)

            try:
                if not any(user_dir.iterdir()):
                    user_dir.rmdir()
                    logger.info("Removed empty user dir: %s", user_dir)
            except Exception:
                pass

    logger.info("Cleanup finished. Deleted %d model cache directories.", deleted_count)
    return deleted_count, errors


if __name__ == "__main__":
    cleanup_old_data()
