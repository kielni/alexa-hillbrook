const moment = require('moment-timezone');
const alexa = require('alexa-app');
const events = require('./events');

const app = new alexa.app('hillbrook-calendar');

const card = { type: 'Standard' };

function sendResponse(dt, lines, response) {
    const say = [];
    const show = [];
    const tag = new RegExp(/(<([^>]+)>)/ig);

    lines.forEach((line) => {
        say.push(`<s>${line}</s>`);
        show.push(line.replace(tag, ''));
    });
    card.title = dt.format('dddd, MMM D');
    card.text = show.join('\n');
    response.card(card);
    response.say(say.join(' '));
    response.send();
}

app.launch(function(request, response) {
    const dt = events.getDate(null);

    events.forDay(dt).then((say) => {
        sendResponse(dt, say, response);
    });

    return false;
});

app.intent(
    'forDay',
    {
        slots: { WHEN: 'AMAZON.DATE' },
        utterances: [
            '{-|WHEN}',
            'give me events for {-|WHEN}',
            'tell me about {-|WHEN}',
            "what's on {for|} {-|WHEN}",
            "what's happening {-|WHEN}",
            '{give|tell} me the {schedule|calendar} for {-|WHEN}',
        ],
    },

    function(request, response) {
        console.log(`intent.forDay: when=${request.slot('WHEN')}`);
        const when = moment.tz(request.slot('WHEN'), 'America/Los_Angeles').startOf('day');

        events.forDay(when).then((say) => {
            sendResponse(when, say, response);
        });

        return false;
    }
);

app.sessionEnded(function(request/* , response */) {
    console.log(`session ended for ${request.userId}`);
});

if (process.argv.length > 2) {
    const arg = process.argv[2];

    if (arg === '-s' || arg === '--schema') {
        console.log(app.schema());
    }
    if (arg === '-u' || arg === '--utterances') {
        console.log(app.utterances());
    }
}

module.exports = app;
