LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {"standard": {"format": "%(levelname)s %(name)s %(message)s",},},
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "standard"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "": {"handlers": ["console"], "level": "INFO"},
}

ICAL_URL = (
    "https://hillbrook.myschoolapp.com/podium/feed/iCal.aspx?"
    "z=0s%2feotx4yJDlRqdEhJ8zc%2baEu05q%2bFx029HqFcsGumPvnkQUamCwj2qiH4edRKSkQh7IMhAL"
    "%2fSxXjFPbmgj4oA%3d%3d"
)
S3_BUCKET = "alexa-hillbrook"
PARSED_FILENAME = "events.json"
PARSED_URL = f"https://s3-us-west-1.amazonaws.com/{S3_BUCKET}/{PARSED_FILENAME}"
