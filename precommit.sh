#!/bin/bash

black hillbrook_calendar
flake8 hillbrook_calendar
mypy --no-strict-optional hillbrook_calendar

