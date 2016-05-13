var moment = require('moment-timezone'),
    cal = require('./calendar'),
    alexa = require('alexa-app');
var app = new alexa.app('hillbrook-calendar');

var swim = 'Pack your swim gear.';
var dayMessages = {
    '2': {
        'A': [swim],
        'B': [swim],
        'C': [swim, 'Teslas, bring your library books back.'],
        'D': [swim],
        'E': [swim, 'Zipliners, bring your library books back.']
    }
};

app.launch(function(request, response) {
    var now = moment().tz('America/Los_Angeles');
    var day = now.day();
    var hour = now.hour();
    console.log('day='+day+' hour='+hour);
    // weekend
    if (day === 6 || (day === 0 && hour < 12) || (day == 5 && hour >= 15)) {
        response.say("It's the weekend.  Go play.");
        return;
    }
    // all day today or tomorrow if after school
    // start at 00:00 UTC since that's how A-F days are described
    var fromDt = moment().startOf('day');
    var toDt = moment().tz('America/Los_Angeles').add(1, 'days');
    if (hour >= 15) {
        fromDt.add(1, 'days');
        toDt.add(1, 'days');
    }
    var dayExp = new RegExp(/([A-F]) Day/);
    var dayName = hour < 15 ? 'today' : 'tomorrow';
    var noSchool = new RegExp(/no school/i);
    console.log('starting load events');
    var hbDay = null;
    cal.loadEvents(fromDt.toDate(), toDt.toDate(), function(err, events) {
        console.log('got events');
        /*
        { start: { Fri, 13 May 2016 07:00:00 GMT tz: undefined },
          end: { Sat, 14 May 2016 07:00:00 GMT tz: undefined },
          summary: 'F Day' }
        { start: { Fri, 13 May 2016 18:30:00 GMT tz: 'America/Los_Angeles' },
          end: { Fri, 13 May 2016 21:30:00 GMT tz: 'America/Los_Angeles' },
          summary: 'All School Walkathon' }
        */
        if (!events || !events.length) {
            response.say('Nothing going on today.');
            response.send();
            return;
        }
        console.log('loaded '+events.length+' events');
        var say = [];
        say.push(hour < 12 ? 'Good morning.' : 'Good afternoon.');
        events.forEach(function(ev) { 
            if (ev.summary.match(noSchool)) {
                say.push('No school '+dayName+'.');
            }
            var dayMatch = ev.summary.match(dayExp);
            if (dayMatch) {
                hbDay = dayMatch[1];
                // Today/Tomorrow is X day.
                say.push(dayName.charAt(0).toUpperCase()+dayName.slice(1)+' is '+
                    ev.summary.replace('Day', 'day.'));
            } else {
                var start = moment(ev.start);
                // 2pm or 2:30pm
                var format = start.minute() === 0 ? 'hA' : 'h:mmA';
                var verb = start.isAfter(now) ? 'is' : 'was';
                say.push(ev.summary+'  '+verb+' at '+start.format(format)+'.');
            }
        });
        // TODO: grade specific
        var grade = '2';
        // reminders only in the morning
        if (hour < 8 && hbDay && dayMessages[grade] && dayMessages[grade][hbDay]) {
            say = say.concat(dayMessages[grade][day]);
        }
        var out = say.map(function(sentence) {
            return '<s>'+sentence+'</s>';
        });
        console.log('returning ', out.join('\n'));
        response.say('<speak>\n'+out.join('\n')+'</speak>');
        response.send();
    });
    return false;
});
/*
console.log('\n\nSCHEMA:\n\n'+app.schema()+'\n\n');
console.log('\n\nUTTERANCES:\n\n'+app.utterances()+'\n\n');
*/
exports.handler = app.lambda();
