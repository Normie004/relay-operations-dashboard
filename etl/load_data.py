"""Validate local CSV records and refresh the demo SQLite database."""
import csv
import sqlite3
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "data" / "requests.csv"
DB = ROOT / "data" / "dashboard.db"


def clean_row(row, line):
    try:
        request_id = int(row["id"])
        week = date.fromisoformat(row["week"].strip()).isoformat()
        category = row["category"].strip()
        status = row["status"].strip()
        effort_hours = float(row["effort_hours"])
        if request_id <= 0 or not category or status not in {"Completed", "Open"} or effort_hours < 0:
            raise ValueError("invalid value")
        return (request_id, week, category, status, effort_hours)
    except (ValueError, TypeError, KeyError) as error:
        raise ValueError(f"Invalid CSV record at line {line}: {error}") from error


def main():
    rows = []
    with CSV.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        required = {"id", "week", "category", "status", "effort_hours"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError("CSV is missing required columns")
        for number, row in enumerate(reader, start=2):
            rows.append(clean_row(row, number))

    if len({row[0] for row in rows}) != len(rows):
        raise ValueError("Duplicate request IDs in source")
    with sqlite3.connect(DB) as database:
        database.execute("""
            CREATE TABLE IF NOT EXISTS service_requests (
                id INTEGER PRIMARY KEY,
                week TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('Open', 'Completed')),
                effort_hours REAL NOT NULL CHECK(effort_hours >= 0)
            )
        """)
        database.execute("DELETE FROM service_requests")
        database.executemany("INSERT INTO service_requests VALUES (?, ?, ?, ?, ?)", rows)
    print(f"Loaded {len(rows)} validated records into {DB}")


if __name__ == "__main__":
    main()
