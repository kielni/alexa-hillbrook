# Hillbrook School calendar via Alexa

Alexa tells you what's happening at school from the Hillbrook School calendar (ical feed).

_"Alexa, launch Hillbrook bear"_

    Today is Free Dress Day for all students

_"Alexa, ask Hillbrook bear about tomorrow"_

    Tomorrow Art Show Opening at 3:30PM.

_"Alexa, what's happening Friday with Hillbrook bear"_

    Friday Green Participation Day.

![VUI diagram](https://github.com/kielni/alexa-hillbrook/blob/master/images/hillbrook_vui.png "VUI diagram")


## development

![architecture](https://github.com/kielni/alexa-hillbrook/blob/master/images/alexa-calendar.png "architecture diagram")


Built with [alexa-app](https://github.com/matt-kruse/alexa-app) and Alexa command-line [(alcl)](https://github.com/kielni/alcl).  Uses [ical](https://www.npmjs.com/package/ical) for parsing Hillbrook's public calendar and [moment](http://momentjs.com/docs/) for date magic.  Hosted on [AWS Lambda](https://aws.amazon.com/lambda/).

### local

`index.js` exports an `alexa-app`:

    var app = new alexa.app('hillbrook-calendar');

run [alexa-app-server](https://www.npmjs.com/package/alexa-app-server)

go to http://localhost:8080/alexa/hillbrook-calendar to send requests

### AWS

The AWS Lambda function handler is set to `lambda.handler`.

`lambda.js` exports the lambda setup handler:

    exports.handler = app.lambda();

#### push to AWS

    alcl push

#### test launch intent

    alcl test

