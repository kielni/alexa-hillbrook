from datetime import date, datetime
import logging

from ask_sdk_core.skill_builder import SkillBuilder
from ask_sdk_core.utils import is_request_type, is_intent_name
from ask_sdk_core.handler_input import HandlerInput

from ask_sdk_model.ui import SimpleCard
from ask_sdk_model import Response

import events


log = logging.getLogger(__name__)
log.setLevel(logging.INFO)

sb = SkillBuilder()


@sb.request_handler(can_handle_func=is_request_type("LaunchRequest"))
def launch_request_handler(handler_input: HandlerInput) -> Response:
    """Get events for today."""
    day = events.get_date()
    text = events.for_day(day)

    return (
        handler_input.response_builder.speak(text)
        .set_card(SimpleCard(f"Hillbrook events for {day.strftime('%A')}:\n{text}"))
        .set_should_end_session(True)
        .response
    )


@sb.request_handler(can_handle_func=is_intent_name("forDay"))
def for_day_request_handler(handler_input: HandlerInput) -> Response:
    """Get events for the day in WHEN slot."""
    if "WHEN" in handler_input.attributes_manager.session_attributes:
        day = handler_input.attributes_manager.session_attributes["WHEN"]
        log.info("day=%s type=%s", day, type(day))
        if type(day) == date:
            day = datetime(day.year, day.month, day.day)
    else:
        day = events.get_date()
    text = events.for_day(day)

    return (
        handler_input.response_builder.speak(text)
        .set_card(SimpleCard(f"Hillbrook events for {day.strftime('%A')}:\n{text}"))
        .set_should_end_session(True)
        .response
    )


# Alexa skill handler
skill_handler = sb.lambda_handler()


# Cache ical events as S3 JSON
def cache_handler(event, context):
    """Load ical-formatted calendar data, parse, and save events for next 7 days to S3."""
    events.cache()
