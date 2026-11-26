import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from etl import load_data


class EffortImportTests(unittest.TestCase):
    def test_invalid_refresh_preserves_previous_report(self):
        header = "id,week,category,status,effort_hours\n"
        with tempfile.TemporaryDirectory() as folder:
            csv_file = Path(folder) / "requests.csv"
            db_file = Path(folder) / "report.db"
            with patch.object(load_data, "CSV", csv_file), patch.object(load_data, "DB", db_file):
                csv_file.write_text(header + "1,2026-10-05,Support,Open,0\n"
                                    + "2,2026-10-05,Reporting,Completed,2.5\n")
                load_data.main()
                for effort in ("NaN", "inf", "-Infinity", "1e999", "-0.5", "unknown", ""):
                    with self.subTest(effort=effort):
                        csv_file.write_text(header + "3,2026-10-12,Support,Open,1\n"
                                            + f"4,2026-10-12,Support,Open,{effort}\n")
                        with self.assertRaisesRegex(ValueError, "line 3: effort_hours"):
                            load_data.main()
                        with sqlite3.connect(db_file) as db:
                            rows = db.execute("SELECT id, effort_hours FROM service_requests ORDER BY id").fetchall()
                        self.assertEqual(rows, [(1, 0.0), (2, 2.5)])
