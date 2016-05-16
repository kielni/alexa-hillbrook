var moment = require('moment-timezone'),
    alexa = require('alexa-app'),
    events = require('./events');

var app = new alexa.app('hillbrook-calendar');

app.launch(function(request, response) {
    // TODO: wait for a response
    return events.forDay(moment().tz('America/Los_Angeles'), request.userId, response);
});

app.intent('forDay', 
    {
        'slots': { 'WHEN': 'AMAZON.DATE' },
        'utterances': [
            '{for|WHEN}'
        ]
    },

    function(request, response) {
        var when = moment(request.slot('WHEN')).tz('America/Los_Angeles').startOf('day');
        console.log('when='+request.slot('WHEN')+' dt='+when.toDate());
        return events.forDay(when, request.userId, response);
    }
);

app.intent('add',
    {
        'slots': { 'GRADE': 'GRADES' },
        'utterances': [
            '{add|GRADE} {|grade|grader}'
        ]
    },
    function(request, response) {
        var grade = request.slot('GRADE');
        // TODO:
        // slots -> key ([JK,K,1-8])
        // save
        // [1st,2nd..]+(' added')
        // say get x grade events
        console.log('userID=', request.userId);
        response.say('add grade '+grade);
    }
);

app.intent('remove',
    {
        'slots': {'GRADE': 'GRADES'}, 
        'utterances': [
            '{remove|GRADE} {|grade|grader}'
        ]
    },

    function(request, response) {
        var grade = request.slot('GRADE');
        // save and repeat back
        // slots -> key ([JK,K,1-8])
        // save
        // [1st,2nd..]+(' removed')
        console.log('userID=', request.userId);
        response.say('remove grade '+grade);
    }
);

if (process.argv.length > 2) {
    var arg = process.argv[2];
    if (arg === '-s' || arg === '--schema') {
        console.log(app.schema());
    }
    if (arg === '-u' || arg === '--utterances') {
        console.log(app.utterances());
    }
}

module.exports = app;
