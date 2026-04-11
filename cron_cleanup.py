import sys
import os
from llmcore.utils.cleanup import cleanup_old_data

if __name__ == "__main__":
    retention_hours = 24
    if len(sys.argv) > 1:
        try:
            retention_hours = int(sys.argv[1])
        except ValueError:
            print(f"Invalid retention hours: {sys.argv[1]}. Using default 24.")

    print(f"Executing scheduled cleanup task...")
    count, errors = cleanup_old_data(retention_hours=retention_hours)
    
    if errors:
        print(f"Cleanup finished with {len(errors)} errors.")
        for err in errors:
            print(f" - {err}")
    else:
        print(f"Cleanup completed successfully. {count} items removed.")
