# Hillbrook School calendar via Alexa

Alexa tells you what's happening at school from the Hillbrook School calendar (ical feed).

_"Alexa, launch Hillbrook bear"_

    Today is B as in beetle day.

_"Alexa, ask Hillbrook bear about tomorrow"_

    Tomorrow is C as in chinchilla day. Art Show Opening is at 3:30PM.

_"Alexa, what's happening Friday with Hillbrook bear"_

    Friday is E as in earwig day.  It's free dress day.

Alexa can also tell you about grade-specific events, such as library.=

_"Alexa, ask Hillbrook bear about second grade"_

    Tomorrow is C as in cat day.  Art Show Opening is at 3:30PM.  
    Pack your swim gear.  Teslas, bring your library books back.

Once you request a grade, it'll be saved until you remove it.

_"Alexa, tell Hillbrook bear to drop second grade"_

    OK, I'll won't tell you about grade events.

## development

Built with [alexa-app](https://github.com/matt-kruse/alexa-app), Alexa command-line [(alcl)](https://github.com/kielni/alcl), and [AWS Lambda](https://aws.amazon.com/lambda/).

### local

`index.js` exports an `alexa-app`: 

    var app = new alexa.app('hillbrook-calendar');

and defines a mock database:

    app.db = require('./db/mock-db');

run [alexa-app-server](https://www.npmjs.com/package/alexa-app-server)

go to http://localhost:8080/alexa/hillbrook-calendar to send requests

### AWS

The AWS Lambda function handler is set to `lambda.handler`. 

`lambda.js` exports the lambda setup handler:

    exports.handler = app.lambda();

and defines a DynamoDB using [dynasty](https://www.npmjs.com/package/dynasty):

    app.db = require('db/dynasty-db');

#### push to AWS

    alcl push

#### test launch intent

    alcl test

#### test add intent

    alcl test -f aws/add.json

with request data in `aws/add.json`
