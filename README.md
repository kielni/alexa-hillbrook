# Hillbrook School calendar via Alexa

Alexa tells you what's happening at school from the Hillbrook School calendar (ical feed).

_"Alexa, launch Hillbrook bear"_

    Today is Free Dress Day.

_"Alexa, ask Hillbrook bear about tomorrow"_

    Tomorrow is Art Show Opening at 3:30PM.

_"Alexa, what's happening Friday with Hillbrook bear"_

    Friday is Green Participation Day.

![VUI diagram](https://github.com/kielni/alexa-hillbrook/blob/master/images/hillbrook_vui.png "VUI diagram")


## development

![architecture](https://github.com/kielni/alexa-hillbrook/blob/master/images/alexa-calendar.png "architecture diagram")


[lambda_function.py](hillbrook_calendar/lambda_function.py) defines two AWS Lambda functions:

[cache_handler](hillbrook_calendar/lambda_function.py#L59) loads the ics-formatted calendar, parses it, and uploads events for the next 7 days to a JSON file on S3

[skill_handler](hillbrook_calendar/lambda_function.py#L55) defines the Alexa skill, with two intents. The `launch` intent gets events for today, or tomorrow if after 3pm. The `forDay` event gets events for a requested date (ie "for Wednesday").


## local testing

Install requirements:

    pip install -r requirements.txt
    pip install -r dev-requirements.txt

From [hillbook_calendar](hillbrook_calendar/test.py):

Load events from calendar and write to S3:

    python test.py cache

Caching events requires permission to write to the [config.S3_BUCKET](S3 bucket) using boto3. To write the file locally instead of S3, add `-o filename`:

    python test.py cache -o cache.json

Get events for today or a specific date:

    python test.py events
    python test.py events --date 2020-09-10

## AWS testing

Set an AWS profile that has `lambda:ExecuteFunction permission` permission.

### event caching: `hillbrook-calendar-cache`

Watch the logs:

```
awslogs get /aws/lambda/hillbrook-calendar-cache --watch
```

Run the `hillbrook-calendar-cache` Lambda function:

```
aws lambda invoke --function-name hillbrook-calendar-cache response.json
```

Get the `events.json` file it wrote to S3:

```
curl https://alexa-hillbrook.s3-us-west-1.amazonaws.com/events.json
```

### events: `hillbrookcalendar`

Watch the logs:

```
awslogs get /aws/lambda/hillbrookcalendar --watch
```

Run the `hillbrookcalendar` Lambda function with the launch request:

```
aws lambda invoke --function-name hillbrookcalendar --payload fileb://test/launch.json response.json
```

Display the output:

```
echo "---"; cat response.json; echo; echo "---"
```

To request events for a specific day, set the date in [hillbrook_calendar/test/for_day.json](hillbrook_calendar/test/for_day.json):

```
aws lambda invoke --function-name hillbrookcalendar --payload fileb://test/for_day.json response.json
```
