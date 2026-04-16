import logging
import sys
from llmcore.utils.cleanup import cleanup_old_data

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    retention_hours = 24
    if len(sys.argv) > 1:
        try:
            retention_hours = int(sys.argv[1])
        except ValueError:
            logger.warning("Invalid retention hours: %s. Using default 24.", sys.argv[1])

    logger.info("Executing scheduled cleanup task (retention=%d h)...", retention_hours)
    count, errors = cleanup_old_data(retention_hours=retention_hours)

    if errors:
        logger.error("Cleanup finished with %d error(s).", len(errors))
        for err in errors:
            logger.error("  - %s", err)
    else:
        logger.info("Cleanup completed successfully. %d local cache dir(s) removed.", count)
