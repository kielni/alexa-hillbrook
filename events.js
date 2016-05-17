var Promise = require('bluebird'),
    moment = require('moment-timezone'),
    rp = require('request-promise'),
    cal = require('./calendar'),
    speech = require('./speech.json');



function toSpeech(dayName, events, grades, dayMessages) {
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
        return('Nothing going on.');
    }
    var now = moment.tz(moment(), 'America/Los_Angeles');
    var dayExp = new RegExp(/([A-F]) Day/);
    var noSchool = new RegExp(/no school/i);
    var hbDay = null;
    var say = [];
    events.forEach(function(ev) {
        var start = ev.start;
        if (ev.summary.match(noSchool)) {
            say.push('No school '+start.format('dddd')+'.');
            return;
        }
        var dayMatch = ev.summary.match(dayExp);
        if (dayMatch) {
            hbDay = dayMatch[1];
            var idx = Math.floor(Math.random()*speech.dayWords[hbDay].length);
            // Today/Tomorrow is X day.
            say.push(dayName.charAt(0).toUpperCase()+dayName.slice(1)+' is '+
                '<say-as interpret-as="characters">'+hbDay+'</say-as> '+
                '<break strength="medium" /> '+
                'as in '+speech.dayWords[hbDay][idx]+' day.');
        } else {
            var verb = start.isAfter(now) ? 'is' : 'was';
            // don't say time for all-day events
            if (ev.end.diff(start, 'day') == 1) {
                if (dayName === 'today' || dayName === 'tomorrow') {
                    say.push(dayName+' '+verb+' '+ev.summary);
                } else {
                    say.push("It's "+ev.summary);
                }
            } else {
                // 2pm or 2:30pm
                var format = start.minute() === 0 ? 'hA' : 'h:mmA';
                say.push(ev.summary+'  '+verb+' at '+start.format(format)+'.');
            }
        }
    });

    if (!grades || !grades.length) {
        grades = ['2'];
    }
    var i = 0;
    console.log('hbDay='+hbDay+' hour='+now.hour()+' dayName='+dayName);
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
    // returns a promise that resolves to SSML to say
    forDay: function(dt, db, userId) {
        var now = moment.tz(moment(), 'America/Los_Angeles');
        var isCurrent = dt === null;
        if (!dt) {
            dt = moment.tz(moment(), 'America/Los_Angeles');
        }
        console.log('forDay dt='+dt.toISOString()+' userId='+userId);
        var day = dt.day();
        var hour = dt.hour();
        // weekend
        if (day === 6 || (day === 0 && hour < 12) || (day == 5 && hour >= 15)) {
            return new Promise(function(resolve) {
                resolve("It's the weekend.  Go play.");
            });
        }

        var fromDt = moment(dt);
        var toDt = moment(dt).add(1, 'days');
        var dayName;
        if (isCurrent) {
            // after school today; get tomorrow
            if (hour >= 15) {
                fromDt.add(1, 'days');
                toDt.add(1, 'days');
                dayName = 'tomorrow';
            } else {
                dayName = 'today';
            }
        } else {
            if (now.format('MMDD') === dt.format('MMDD')) {
                dayName = 'today';
            } else {
                var tomorrow = moment(now).add(1, 'days');
                dayName = tomorrow.format('MMDD') === dt.format('MMDD') ? 'tomorrow' : dt.format('dddd');
            }
        }

        var promises = [
            cal.loadEvents(fromDt, toDt),
            db.get(userId),
            rp('https://s3.amazonaws.com/kielni-alexa/day-messages.json')
        ];
        return Promise.all(promises).then(function(results) {
            var dayMessages = results[2] ? JSON.parse(results[2]) : null;
            return toSpeech(dayName, results[0], results[1], dayMessages);
        });
    }
};
