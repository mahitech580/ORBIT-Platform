"""Idempotently create ORBIT's production tables before starting Gunicorn."""
from pathlib import Path
import sys
import time

import psycopg2

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import get_db  # noqa: E402


def initialize_schema():
    schema_path = REPO_ROOT / "database" / "schema.sql"
    schema = schema_path.read_text(encoding="utf-8")
    last_error = None

    # Managed databases can take a short time to accept connections during deploy.
    for attempt in range(1, 13):
        connection = None
        try:
            connection = get_db()
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(schema)
            print("ORBIT database schema is ready.")
            return
        except psycopg2.OperationalError as error:
            last_error = error
            if attempt == 12:
                break
            delay = min(attempt * 2, 10)
            print(f"Database not ready (attempt {attempt}/12); retrying in {delay}s.")
            time.sleep(delay)
        finally:
            if connection is not None:
                connection.close()

    raise RuntimeError("Could not initialize the ORBIT database after 12 attempts.") from last_error


if __name__ == "__main__":
    initialize_schema()
