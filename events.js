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
    console.log('returning ', say);
    return say;
}

module.exports = {
    getDate: function(dt) {
        var now = moment.tz(moment(), 'America/Los_Angeles');
        var isCurrent = dt === null;
        if (!dt) {
            dt = moment.tz(moment(), 'America/Los_Angeles');
        }
        var day = dt.day();
        var hour = dt.hour();
        var fromDt = moment(dt);
        var dayName;
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
        if (day === 6 || (day === 0 && hour < 12) || (day == 5 && hour >= 15)) {
            return new Promise(function(resolve) {
                resolve(["It's the weekend.  Go play."]);
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
            var dayMessages = results[2] ? JSON.parse(results[2]) : null;
            return toSpeech(dayName, results[0], results[1], dayMessages);
        });
    }
};
