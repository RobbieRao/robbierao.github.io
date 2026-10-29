import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('analytics_export', Path(__file__).with_name('export.py'))
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class ExportTests(unittest.TestCase):
    def test_local_date_uses_hong_kong_midnight(self):
        self.assertEqual(export.date_ms('1970-01-02'), 16 * 60 * 60 * 1000)

    def test_csv_formulas_are_inert_but_normal_fields_are_preserved(self):
        for value in ['=HYPERLINK("bad")', '  +cmd', '@SUM(1)', '\t=cmd', '-cmd']:
            self.assertTrue(export.csv_value(value).startswith("'"))
        self.assertEqual(export.csv_value('192.0.2.24'), '192.0.2.24')
        self.assertEqual(export.csv_value(42), 42)

    def test_keyset_pagination_preserves_equal_timestamp_events(self):
        query = export.query_page(1, 100, (50, '12345678-1234-4234-8234-123456789abc'))
        self.assertIn('occurred_at = 50 AND event_id >', query)
        self.assertIn('ORDER BY occurred_at, event_id LIMIT 1000', query)
        with self.assertRaises(ValueError):
            export.query_page(1, 100, (50, "'; DROP TABLE pageviews;--"))


if __name__ == '__main__':
    unittest.main()
