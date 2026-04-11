import os
import shutil
import time
from pathlib import Path

def cleanup_old_data(retention_hours: int = 24):
    repo_root = Path(__file__).resolve().parents[2]
    target_dirs = [repo_root / "models", repo_root / "output"]
    current_time = time.time()
    retention_seconds = retention_hours * 3600
    deleted_count = 0
    errors = []
    print(f"Starting cleanup: Retention = {retention_hours} hours")
    for base_dir in target_dirs:
        if not base_dir.exists():
            continue
        print(f"Checking directory: {base_dir}")
        for item in base_dir.iterdir():
            if item.is_dir():
                last_modified = item.stat().st_mtime
                age_seconds = current_time - last_modified
                if age_seconds > retention_seconds:
                    try:
                        print(f"Deleting expired data: {item.name} (Age: {age_seconds/3600:.1f} hours)")
                        shutil.rmtree(item)
                        deleted_count += 1
                    except Exception as e:
                        errors.append(f"Failed to delete {item}: {e}")
    print(f"Cleanup finished. Deleted {deleted_count} directories.")
    return deleted_count, errors

if __name__ == "__main__":
    cleanup_old_data()
