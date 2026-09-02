import logging
import re
from typing import Any

SENSITIVE_PATTERNS = [
    re.compile(r"mongodb(?:\+srv)?://[^\s]+", re.IGNORECASE),
    re.compile(r"Bearer\s+[A-Za-z0-9._\-]+", re.IGNORECASE),
    re.compile(r"gsk_[A-Za-z0-9]+", re.IGNORECASE),
    re.compile(r"(api[_-]?key|password|secret|token)=([^\s&]+)", re.IGNORECASE),
]


def sanitize_for_log(value: Any) -> str:
    text = str(value)
    for pattern in SENSITIVE_PATTERNS:
        text = pattern.sub(
            lambda match: (
                f"{match.group(1)}=<REDACTED>"
                if match.lastindex
                else "<REDACTED>"
            ),
            text,
        )
    return text


class RedactingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return sanitize_for_log(super().format(record))


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(
        RedactingFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
        )
    )
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
