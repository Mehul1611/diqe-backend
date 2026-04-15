import logging
import os
import sys
from pathlib import Path

_configured = False


def configure_logging() -> None:
    global _configured
    if _configured:
        return
    _configured = True

    log_file = Path(__file__).resolve().parents[1] / "app.log"

    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"

    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    # Default to stdout-only; enable file logging by setting DIQE_FILE_LOGS=1.
    if str(os.environ.get("DIQE_FILE_LOGS", "")).strip() in ("1", "true", "True"):
        handlers.append(logging.FileHandler(str(log_file), encoding="utf-8"))

    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        datefmt=date_fmt,
        handlers=handlers,
    )


configure_logging()
