var moment = require('moment-timezone'),
    alexa = require('alexa-app'),
    events = require('./events'),
    speech = require('./speech.json');

var app = new alexa.app('hillbrook-calendar');
app.db = require('./db/mock-db');

var card = {
    type: 'Standard'
};

function getDatabase() {
    return app.db;
}

function getGrade(gradeSlot) {
    var grade = gradeSlot.match(/(\d)[a-z][a-z]/);
    return grade || speech.toGrade[gradeSlot];
}

function sendResponse(dt, lines, response) {
    var say = [];
    var show = [];
    var tag = new RegExp(/(<([^>]+)>)/ig);
    lines.forEach(function(line) {
        say.push('<s>'+line+'</s>');
        show.push(line.replace(tag, ''));
    });
    card.title = dt.format('dddd, MMM D');
    card.text = show.join('\n');
    response.card(card);
    response.say(say.join('\n'));
    response.send();
}

app.launch(function(request, response) {
    var dt = events.getDate(null);
    events.forDay(dt, getDatabase(), request.userId).then(function(say) {
        sendResponse(dt, say, response);
    });
    return false;
});

app.intent('forDay',
    {
        'slots': { 'WHEN': 'AMAZON.DATE' },
        'utterances': [
            '{-|WHEN}',
            'give me events for {-|WHEN}',
            'tell me about {-|WHEN}',
            "what's on {for|} {-|WHEN}",
            "what's happening {-|WHEN}",
            '{give|tell} me the {schedule|calendar} for {-|WHEN}'
        ]
    },

    function(request, response) {
        console.log('intent.forDay: when=', request.slot('WHEN'));
        var when = moment.tz(request.slot('WHEN'), 'America/Los_Angeles').startOf('day');
        events.forDay(when, getDatabase(), request.userId).then(function(say) {
            sendResponse(when, say, response);
        });
        return false;
    }
);

app.intent('add',
    {
        'slots': { 'GRADE': 'GRADES' },
        'utterances': [
            'add {-|GRADE}',
            'add {-|GRADE} grade',
            'add {a |} {-|GRADE} grader',
            'about {a |} {-|GRADE} {grade|grader}'
        ]
    },
    function(request, response) {
        var grade = getGrade(request.slot('GRADE'));
        console.log('intent.add: grade='+request.slot('GRADE')+' got '+grade);
        if (!grade) {
            response.say(speech.gradeError.replace('GRADE', request.slot('GRADE')));
            return;
        }
        var dt = events.getDate();
        getDatabase().add(request.userId, grade).then(function(resp) {
            if (resp.added) { // was added
                response.say('OK.');
            }
            events.forDay(dt, getDatabase(), request.userId).then(function(say) {
                sendResponse(dt, say, response);
            });
        });
        return false;
    }
);

app.intent('remove',
    {
        'slots': {'GRADE': 'GRADES'}, 
        'utterances': [
            'remove {-|GRADE} grade',
            'remove {a |} {-|GRADE} grader'
        ]
    },

    function(request, response) {
        var grade = getGrade(request.slot('GRADE'));
        console.log('intent.remove: grade='+request.slot('GRADE')+' got '+grade);
        if (!grade) {
            response.say(speech.gradeError.replace('GRADE', request.slot('GRADE')));
            return;
        }
        getDatabase().remove(request.userId, grade).then(function(resp) {
            if (resp.grades && resp.grades.length) {
                var graders = resp.grades.map((function(grade) {
                    return speech.ers[grade];
                }));
                response.say("OK, I'll only tell you about events for "+
                    graders.join(' and ')+'.');

            } else {
                response.say("OK, I'll won't tell you about grade events.");
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
