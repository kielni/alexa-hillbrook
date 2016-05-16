var moment = require('moment-timezone'),
    alexa = require('alexa-app'),
    events = require('./events');

var app = new alexa.app('hillbrook-calendar');

app.launch(function(request, response) {
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
        // save and repeat back
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
        console.log('userID=', request.userId);
        response.say('remove grade '+grade);
    }
);

app.intent('jokes',
    {
        'slots': {'TELL': 'ON_OFF'}, 
        'utterances': [
            '{turn on|TELL}'
        ]
    },

    function(request,response) {
        // save and repeat back
        var jokes = req.slot('JOKES');
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
