import boto3
from collections import namedtuple
from datetime import date, datetime, timedelta
import json
import logging
import logging.config
from typing import List

from dateutil import parser as date_parser
from dateutil import tz
from icalendar import Calendar
import requests

import config


logging.config.dictConfig(config.LOGGING)
log = logging.getLogger(__name__)


Event = namedtuple("Event", ["start", "end", "summary"])


def load_from_parsed(from_dt: datetime, to_dt: datetime) -> List[Event]:
    """Load events from S3 JSON and return list of events in date range."""
    from_str = from_dt.strftime("%Y-%m-%d %H:%m")
    to_str = to_dt.strftime("%Y-%m-%d %H:%m")
    log.info("start load events from file: %s to %s", from_str, to_str)
    data = requests.get(config.PARSED_URL).json()
    events: List[Event] = []
    for ev in data:
        if ev["start"] < from_str or ev["start"] > to_str:
            continue
        ev["start"] = date_parser.parse(ev["start"])
        ev["end"] = date_parser.parse(ev["end"])
        events.append(Event(**ev))
    log.info("%s matching events", len(events))
    return events


def _to_datetime(dt) -> datetime:
    """Convert dt to a naive datetime."""
    if isinstance(dt, datetime):
        return dt.replace(tzinfo=None)
    if isinstance(dt, date):
        return datetime(dt.year, dt.month, dt.day)
    return datetime.now()


def load_from_ical(from_dt: datetime, to_dt: datetime) -> List[Event]:
    """Load calendar events from ical, parse, and return events in the date range."""
    log.info("start load events for %s - %s", from_dt, to_dt)
    resp = requests.get(config.ICAL_URL, headers={"User-Agent": "Mozilla/5.0"})
    cal = Calendar.from_ical(resp.text)
    events: List[Event] = []
    for event in cal.walk("vevent"):
        if not event.get("dtstart") or not event.get("dtend"):
            continue
        start = _to_datetime(event.get("dtstart").dt)
        if start < from_dt or start > to_dt:
            continue
        events.append(
            Event(
                start=start,
                end=_to_datetime(event.get("dtend").dt),
                summary=str(event.get("summary")),
            )
        )
    return events


def cache():
    """Load events from ical, format as JSON, as save to S3.

    The ical feed is big and slow. Saving the next week of events to a static file makes the
    skill response time faster.
    """
    events = load_from_ical(datetime.now(), datetime.now() + timedelta(days=7))
    log.info("loaded %s events", len(events))
    # convert event dates to strings
    json_events = []
    for event in events:
        json_events.append(
            {
                "start": event.start.strftime("%Y-%m-%d %H:%M")
                if event.start
                else None,
                "end": event.end.strftime("%Y-%m-%d %H:%M") if event.end else None,
                "summary": event.summary,
            }
        )
    client = boto3.client("s3")
    log.info(
        client.put_object(
            ACL="public-read",
            Bucket=config.S3_BUCKET,
            Key=config.PARSED_FILENAME,
            Body=json.dumps(json_events),
            ContentType="application/json",
        )
    )


def _pacific_now() -> datetime:
    """Make a naive datetime in Pacific time (server is UTC)."""
    pt = tz.gettz("America/Los_Angeles")
    return datetime.now().astimezone(pt).replace(tzinfo=None)


def day_name(dt: datetime) -> str:
    """Return today, tomorrow, or weekday name."""
    now = _pacific_now()
    if now.weekday() == dt.weekday():
        return "today"
    if (now.date() - dt.date()).days == 1:
        return "tomorrow"
    return dt.strftime("%A")


def to_speech(day_name: str, events: List[Event]) -> str:
    """Return a list of speech strings from a list of events."""
    log.info("%s events", len(events))
    now = _pacific_now()
    say: List[str] = []
    for event in events:
        if "no school" in event.summary.lower():
            say.append("No school on %s." % event.start.format("%A"))
            continue
        verb = "is" if event.start > now else "was"
        # & is invalid SSML
        summary = event.summary.replace("&", "and")
        # don't say time for all-day events
        # all day events start at midnight UTC (4/5pm PT previous day)
        if event.end.date() > event.start.date():
            verb = "is"
            if day_name in ["today", "tomorrow"]:
                say.append(f"{day_name} {verb} {summary}.")
            else:
                say.append(f"It's ${summary}.")
        else:
            # 2:30pm or 2pm
            dt_format = "%-I:%M %p" if event.start.minute else "%-I %p"
            say.append(f"{summary} {verb} at {event.start.strftime(dt_format)}.")
    return "\n".join(say)


def get_date() -> datetime:
    """Return the current date if during the school date, or tomorrow if after."""
    dt = _pacific_now()
    if dt.hour >= 15:
        dt += timedelta(days=1)
        return datetime(dt.year, dt.month, dt.day)
    return dt


def for_day(from_dt: datetime) -> str:
    """Get the event descriptions for a date."""
    # 6=Sunday, 5=Saturday, 4=Friday
    log.info("events for %s %s", from_dt, from_dt.weekday())
    day = from_dt.weekday()
    if (
        day == 5
        or (day == 6 and from_dt.hour < 12)
        or (day == 4 and from_dt.hour >= 15)
    ):
        return 'It\'s the weekend. <break string="medium" /> Go play.'
    # get events through the end of today
    to_dt = datetime(from_dt.year, from_dt.month, from_dt.day, 23, 59, 59)
    return to_speech(day_name(from_dt), load_from_parsed(from_dt, to_dt))


if __name__ == "__main__":
    log.setLevel(logging.DEBUG)
    print(for_day(get_date()))
