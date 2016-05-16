var moment = require('moment-timezone'),
    alexa = require('alexa-app'),
    events = require('./events'),
    speech = require('./speech.json');

var app = new alexa.app('hillbrook-calendar');
app.db = require('./db/mock-db');

function getDatabase() {
    return app.db;
}

app.launch(function(request, response) {
    // TODO: wait for a response
    return events.forDay(moment().tz('America/Los_Angeles'), getDatabase(), request.userId, response);
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
        return events.forDay(when, getDatabase(), request.userId, response);
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
        var gradeSlot = request.slot('GRADE');
        var grade = speech.toGrade[gradeSlot];
        console.log('add userID='+request.userId+' grade slot='+gradeSlot+' grade='+grade);
        if (!grade) {
            response.say("I don't recognize "+gradeSlot+'. Try pre kindergarten, kindergarten, or first through eighth.');
            return;
        }
        getDatabase().add(request.userId, grade).then(function(resp) {
            // resp= [ '2', '3' ]
            var graders = resp.map((function(grade) {
                return speech.ers[grade];
            }));
            response.say("OK, I'll tell you about events for "+
                graders.join(' and ')+'.');
            response.send();
        });
        return false;
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
        var gradeSlot = request.slot('GRADE');
        var grade = speech.toGrade[gradeSlot];
        console.log('remove userID='+request.userId+' grade slot='+gradeSlot+' grade='+grade);
        if (!grade) {
            response.say("I don't recognize "+gradeSlot+'.  Try pre kindergarten, kindergarten, or first through eighth');
            return;
        }
        getDatabase().remove(request.userId, grade).then(function(resp) {
            // resp= [ '2', '3' ]
            if (resp.length) {
                var graders = resp.map((function(grade) {
                    return speech.ers[grade];
                }));
                response.say("OK, I'll only tell you about events for "+
                    graders.join(' and ')+'.');

            } else {
                response.say("OK, I'll won't tell you about grade-specific events.");
            }
            response.send();
        });
        return false;
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

// dynasty.table('user_grade').find(userId)
// update?
module.exports = app;
