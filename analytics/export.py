"""Export private D1 logs through the owner's existing Wrangler login."""
import argparse
import csv
from datetime import datetime, timezone, timedelta
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent
FIELDS = ('event_id', 'occurred_at', 'visitor_id', 'session_id', 'path', 'referrer_host',
          'ip_address', 'country', 'region', 'city', 'asn', 'network', 'user_agent',
          'device', 'language', 'is_bot')


def date_ms(value):
    """Report dates use Hong Kong local midnight, not the CLI host's timezone."""
    parsed = datetime.strptime(value, '%Y-%m-%d').replace(tzinfo=timezone(timedelta(hours=8)))
    return int(parsed.timestamp() * 1000)


def csv_value(value):
    if value is None:
        return ''
    if isinstance(value, str) and (value.lstrip().startswith(('=', '+', '-', '@')) or value.startswith(('\t', '\r', '\n'))):
        return "'" + value
    return value


def query_page(start, end, cursor=None):
    query = f'SELECT {", ".join(FIELDS)} FROM pageviews WHERE occurred_at >= {int(start)} AND occurred_at < {int(end)}'
    if cursor:
        timestamp, event_id = cursor
        if not re.fullmatch(r'[0-9a-f-]{36}', event_id):
            raise ValueError('Unexpected event identifier in database')
        query += f" AND (occurred_at > {int(timestamp)} OR (occurred_at = {int(timestamp)} AND event_id > '{event_id}'))"
    return query + ' ORDER BY occurred_at, event_id LIMIT 1000;'


def execute(query, config, local):
    command = ['npx', '--yes', 'wrangler@4.154.0', 'd1', 'execute', 'DB', '--config', str(config),
               '--local' if local else '--remote', '--json', '--command', query]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('D1 export failed. Check the Wrangler login, database binding, and config.')
    chunks = json.loads(result.stdout)
    if any(chunk.get('success') is False for chunk in chunks):
        raise RuntimeError('D1 query failed')
    return [row for chunk in chunks for row in chunk.get('results', [])]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--since', required=True, help='YYYY-MM-DD, inclusive in Hong Kong time')
    parser.add_argument('--until', required=True, help='YYYY-MM-DD, exclusive in Hong Kong time')
    parser.add_argument('--config', type=Path, default=ROOT / 'wrangler.local.jsonc')
    parser.add_argument('--local', action='store_true', help='Export a local test database instead of production')
    parser.add_argument('--output', type=Path, help='New CSV path; existing files are never overwritten')
    args = parser.parse_args()
    start, end = date_ms(args.since), date_ms(args.until)
    if start >= end:
        parser.error('--until must be later than --since')
    output = args.output or ROOT / 'exports' / f'visits-{args.since}-to-{args.until}.csv'
    output.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    cursor = None
    count = 0
    # Exclusive creation and mode 0600 keep a private export from replacing another file.
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, 'w', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDS)
            writer.writeheader()
            while True:
                rows = execute(query_page(start, end, cursor), args.config, args.local)
                for row in rows:
                    writer.writerow({field: csv_value(row.get(field)) for field in FIELDS})
                count += len(rows)
                if len(rows) < 1000:
                    break
                cursor = rows[-1]['occurred_at'], rows[-1]['event_id']
    except Exception:
        output.unlink(missing_ok=True)
        raise
    print(f'Exported {count} events to {output}. Raw visitor data was not printed to the terminal.')


if __name__ == '__main__':
    main()
