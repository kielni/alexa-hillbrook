var Promise = require('bluebird'),
    moment = require('moment-timezone'),
    rp = require('request-promise'),
    cal = require('./calendar'),
    speech = require('./speech.json');

function getDayName(dt) {
    var now = moment.tz(moment(), 'America/Los_Angeles');
    if (dt.format('MMDD') === now.format('MMDD')) {
        return 'today';
    }
    if (dt > now && dt.diff(now, 'day') < 2) {
        return 'tomorrow';
    }
    return dt.format('dddd');
}

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
        return(['Nothing going on.']);
    }
    var now = moment.tz(moment(), 'America/Los_Angeles');
    var dayExp = new RegExp(/([A-F]) Day/);
    var noSchool = new RegExp(/no school/i);
    var hbDay = null;
    var say = [];
    events.forEach(function(ev) {
        if (ev.summary.match(noSchool)) {
            return ['No school '+start.format('dddd')+'.'];
        }
        var start = ev.start;
        var dayMatch = ev.summary.match(dayExp);
        if (dayMatch) {
            hbDay = dayMatch[1];
            var idx = Math.floor(Math.random()*speech.dayWords[hbDay].length);
            // Today/Tomorrow/Monday is X day.
            say.push(dayName+' is '+
                '<say-as interpret-as="characters">'+hbDay+'</say-as> '+
                '<break strength="medium" /> '+
                'as in '+speech.dayWords[hbDay][idx]+' day.');
        } else {
            var verb = start.isAfter(now) ? 'is' : 'was';
            // & is invalid ssml
            ev.summary = ev.summary.replace(new RegExp('&', 'g'), 'and');
            // don't say time for all-day events
            if (ev.end.diff(start, 'day') === 1) {
                // all day events start at midnight UTC (4/5pm PT previous day)
                verb = 'is';
                if (dayName === 'today' || dayName === 'tomorrow') {
                    say.push(dayName+' '+verb+' '+ev.summary);
                } else {
                    say.push("It's "+ev.summary+'.');
                }
            } else {
                // 2pm or 2:30pm
                var format = start.minute() === 0 ? 'hA' : 'h:mmA';
                say.push(ev.summary+'  '+verb+' at '+start.format(format)+'.');
            }
        }
    });

    if (!grades) {
        grades = [];
    }
    console.log('hbDay='+hbDay+' hour='+now.hour()+' dayName='+dayName);
    // reminders only same-day morning
    if (hbDay && now.hour() < 8 && dayName === 'today') {
        var i = 0;
        grades.forEach(function(grade) {
            if (!dayMessages[grade] || !dayMessages[grade][hbDay]) {
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
    }
    return say.map(function(line) { return line[0].toUpperCase()+line.slice(1); });
}

module.exports = {
    getDate: function(dt) {
        var isCurrent = dt === null;
        if (!dt) {
            dt = moment.tz(moment(), 'America/Los_Angeles');
        }
        var hour = dt.hour();
        var fromDt = moment(dt);
        console.log('getDate: dt='+dt.toDate()+' isCurrent='+isCurrent+' hour='+hour);
        if (isCurrent && hour >= 15) {
            // after school today; get tomorrow
            fromDt.add(1, 'days').startOf('day');
        }
        return fromDt;
    },

    // returns a promise that resolves to an array of lines to say
    forDay: function(fromDt, db, userId) {
        // weekend
        var day = fromDt.day();
        var hour = fromDt.hour();
        if (day === 6 || (day === 0 && hour < 12) || (day === 5 && hour >= 15)) {
            return new Promise(function(resolve) {
                resolve(["It's the weekend. Go play."]);
            });
        }
        var toDt = moment(fromDt).add(1, 'days');
        var promises = [
            cal.loadEvents(fromDt, toDt),
            db.get(userId),
            rp('https://s3.amazonaws.com/kielni-alexa/day-messages.json')
        ];
        var dayName = getDayName(fromDt);
        return Promise.all(promises).then(function(results) {
            var events = results[0];
            var user = results[1];
            var messages = results[2];
            var dayMessages = messages ? JSON.parse(messages) : null;
            return toSpeech(dayName, events, user, dayMessages);
        });
    }
};
