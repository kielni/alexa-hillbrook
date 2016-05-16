var moment = require('moment-timezone'),
    Promise = require('bluebird'),
    cal = require('./calendar'),
    dayMessages = require('./day-messages'),
    speech = require('./speech.json');

function toSpeech(dayName, events, grades) {
   /*
    { start: { Fri, 13 May 2016 07:00:00 GMT tz: undefined },
      end: { Sat, 14 May 2016 07:00:00 GMT tz: undefined },
      summary: 'F Day' }
    { start: { Fri, 13 May 2016 18:30:00 GMT tz: 'America/Los_Angeles' },
      end: { Fri, 13 May 2016 21:30:00 GMT tz: 'America/Los_Angeles' },
      summary: 'All School Walkathon' }
    */
    console.log('toSpeech: loaded '+events.length+' events grades=', grades);
    if (!events || !events.length) {
        return(['Nothing going on today.']);
    }
    var now = moment().tz('America/Los_Angeles');
    var dayExp = new RegExp(/([A-F]) Day/);
    var noSchool = new RegExp(/no school/i);
    var hbDay = null;
    var say = [];
    if (dayName !== 'today' && dayName !== 'tomorrow') {
        say.push("Here's what's happening on "+dayName+'.');
    }
    events.forEach(function(ev) { 
        var start = moment(ev.start);
        if (ev.summary.match(noSchool)) {
            say.push('No school '+start.format('dddd')+'.');
            return;
        }
        var dayMatch = ev.summary.match(dayExp);
        if (dayMatch) {
            hbDay = dayMatch[1];
            // Today/Tomorrow is X day.
            say.push(dayName.charAt(0).toUpperCase()+dayName.slice(1)+' is '+
                '<say-as interpret-as="characters">'+hbDay+'</say-as>'+
                ' day.');
        } else {
            // 2pm or 2:30pm
            var format = start.minute() === 0 ? 'hA' : 'h:mmA';
            var verb = start.isAfter(now) ? 'is' : 'was';
            say.push(ev.summary+'  '+verb+' at '+start.format(format)+'.');
        }
    });

    if (!grades) {
        grades = ['2'];
    }
    var i = 0;
    grades.forEach(function(grade) {
        if (!hbDay || (now.hour() > 8 && dayName == 'today') || 
            !dayMessages[grade] || !dayMessages[grade][hbDay]) {
            return;
        }
        if (i === 0 && grades.length > 1) {
            say.push(speech.ers[grade]+', '+dayMessages[grade][hbDay][0]);
            if (dayMessages[grade][hbDay].length > 1) {
                say = say.concat(dayMessages[grade][hbDay].slice(1));
            }
        } else {
            say = say.concat(dayMessages[grade][hbDay]);
        }
        i += 1;
    });
    var out = say.map(function(sentence) {
        return '<s>'+sentence+'</s>';
    });
    console.log('returning ', out.join('\n'));
    return('<speak>\n'+out.join('\n')+'</speak>');
}

module.exports = {
    forDay: function(dt, db, userId, response) {
        console.log('forDay dt='+dt.toISOString()+' userId='+userId);
        var now = moment().tz('America/Los_Angeles');
        var day = dt.day();
        var hour = dt.hour();
        // weekend
        if (day === 6 || (day === 0 && hour < 12) || (day == 5 && hour >= 15)) {
            response.say("It's the weekend.  Go play.");
            return;
        }

        var fromDt = moment(dt);
        var toDt = moment(dt).add(1, 'days');
        var dayName;
        if (now.isSame(dt, 'day')) {
            // after school today; get tomorrow
            if (hour >= 15) {
                fromDt.add(1, 'days');
                toDt.add(1, 'days');
                dayName = 'tomorrow';
            } else {
                dayName = 'today';
            }
        } else {
            dayName = dt.format('dddd');
        }

        var promises = [
            cal.loadEvents(fromDt, toDt),
            db.get(userId)
        ];
        var self = this;
        Promise.all(promises).then(function(results) {
            response.say(toSpeech(dayName, results[0], results[1]));
            response.send();
        });
        return false;
    }
};
