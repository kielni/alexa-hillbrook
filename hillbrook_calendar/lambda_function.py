from datetime import datetime
import logging

from ask_sdk_core.skill_builder import SkillBuilder
from ask_sdk_core.utils import is_request_type
from ask_sdk_core.handler_input import HandlerInput
from ask_sdk_model.ui import SimpleCard
from ask_sdk_model import Response
from dateutil import parser as date_parser

import events


log = logging.getLogger(__name__)
log.setLevel(logging.INFO)

sb = SkillBuilder()


@sb.request_handler(can_handle_func=is_request_type("LaunchRequest"))
def launch_request_handler(handler_input: HandlerInput) -> Response:
    """Get events for today."""
    day = events.get_date()
    text = events.for_day(day)
    log.info(f"launch: events for {day} = {text}")
    return (
        handler_input.response_builder.speak(text)
        .set_card(SimpleCard(f"Hillbrook events for {day.strftime('%A')}:\n{text}"))
        .set_should_end_session(True)
        .response
    )


def test_intent(handler_input):
    # intent.name intent.slots
    # for key in ["request_envelope", "attributes_manager", "context"]:
    #    log.info("handler_input.%s=%s", key, getattr(handler_input, key))
    log.info(
        "handler_input.request_envelope.request.intent |%s|",
        handler_input.request_envelope.request.intent,
    )
    return handler_input.request_envelope.request.intent.name == "forDay"


@sb.request_handler(can_handle_func=test_intent)
def for_day_request_handler(handler_input: HandlerInput) -> Response:
    """Get events for the day in WHEN slot."""
    log.info(
        f"forDay: session_attributes={handler_input.attributes_manager.session_attributes}"
    )
    intent = handler_input.request_envelope.request.intent
    when = intent.slots.get("WHEN")
    log.info(f"forDay: when.value={when.value}")
    if when.value:
        day = date_parser.parse(when.value)
        day = datetime(day.year, day.month, day.day)
    else:
        day = events.get_date()
    text = events.for_day(day)
    log.info(f"forDay events for {day} = {text}")

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
