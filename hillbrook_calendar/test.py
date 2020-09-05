import argparse
from datetime import datetime
import json
import logging

from dateutil import parser as date_parser

import events


log = logging.getLogger(__name__)
log.setLevel(logging.DEBUG)

"""
    Load events from calendar and write to the console or a file:
        python test.py cache

    Get events for today or a specific date:
        python test.py events
        python test.py events --date 2020-09-10
"""


def cache():
    print(json.dumps(events.create_cached(), indent=2))


def get_events(dt: datetime):
    print(f"Events as of {dt.strftime('%A %B %-d %-I:%M %p')}:\n")
    print(events.for_day(dt))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Hillbrook calendar")
    parser.add_argument("run", type=str, help="cache or events")
    parser.add_argument("-d", "--date", type=str)
    args = parser.parse_args()
    if args.run == "cache":
        cache()
    if args.run == "events":
        print(f"date={args.date}")
        get_events(date_parser.parse(args.date) if args.date else datetime.now())
