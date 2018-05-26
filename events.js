const moment = require('moment-timezone');
const cal = require('./calendar');
const days = require('./days.json');
const speech = require('./speech.json');

function getDayName(dt) {
    const now = moment.tz(moment(), 'America/Los_Angeles');
    if (dt.format('MMDD') === now.format('MMDD')) {
        return 'today';
    }
    if (dt > now && dt.diff(now, 'day') < 2) {
        return 'tomorrow';
    }

    return dt.format('dddd');
}

function toSpeech(dayName, events, grades) {
    /*
    { start: { Fri, 13 May 2016 07:00:00 GMT tz: undefined },
      end: { Sat, 14 May 2016 07:00:00 GMT tz: undefined },
      summary: 'F Day' }
    { start: { Fri, 13 May 2016 18:30:00 GMT tz: 'America/Los_Angeles' },
      end: { Fri, 13 May 2016 21:30:00 GMT tz: 'America/Los_Angeles' },
      summary: 'All School Walkathon' }
    */
    console.log(`toSpeech: loaded ${events.length} events grades=${grades}`);
    if (!events || !events.length) {
        return(['Nothing going on.']);
    }

    const now = moment.tz(moment(), 'America/Los_Angeles');
    const dayExp = new RegExp(/([A-F]) Day/);
    const noSchool = new RegExp(/no school/i);
    const hbDay = null;
    let say = [];

    events.forEach((ev) => {
        const start = ev.start;
        const dayMatch = ev.summary.match(dayExp);

        if (ev.summary.match(noSchool)) {
            say.push([`No school ${start.format('dddd')}.`]);

            return;
        }

        if (dayMatch) {
            const hbDay = dayMatch[1];
            const idx = Math.floor(Math.random() * speech.dayWords[hbDay].length);
            // Today/Tomorrow/Monday is X day.
            say.push(`${dayName} is <say-as interpret-as="characters">${hbDay}</say-as>
                <break strength="medium" /> as in ${speech.dayWords[hbDay][idx]} day.`);
        } else {
            let verb = start.isAfter(now) ? 'is' : 'was';
            // & is invalid ssml
            ev.summary = ev.summary.replace(new RegExp('&', 'g'), 'and');
            // don't say time for all-day events
            if (ev.end.diff(start, 'day') === 1) {
                // all day events start at midnight UTC (4/5pm PT previous day)
                verb = 'is';
                if (dayName === 'today' || dayName === 'tomorrow') {
                    say.push(`${dayName} ${verb} ${ev.summary}`);
                } else {
                    say.push(`It's ${ev.summary}.`);
                }
            } else {
                // 2pm or 2:30pm
                const format = start.minute() === 0 ? 'hA' : 'h:mmA';
                say.push(`${ev.summary} ${verb} at ${start.format(format)}.`);
            }
        }
    });

    if (!grades) {
        grades = [];
    }
    console.log(`hbDay=${hbDay} hour=${now.hour()} dayName=${dayName}`);
    // reminders only same-day morning
    if (hbDay && now.hour() < 8 && dayName === 'today') {
        let i = 0;

        grades.forEach((grade) => {
            if (!days[grade] || !days[grade][hbDay]) {
                return;
            }
            if (i === 0 && grades.length > 1) {
                say.push(`${speech.ers[grade]}, ${days[grade][hbDay][0]}`);
                if (days[grade][hbDay].length > 1) {
                    say = say.concat(days[grade][hbDay].slice(1));
                }
            } else {
                say = say.concat(days[grade][hbDay]);
            }
            i += 1;
        });
    }

    return say.map(line => line[0].toUpperCase() + line.slice(1));
}

module.exports = {
    getDate(dt) {
        const isCurrent = dt === null;
        if (!dt) {
            dt = moment.tz(moment(), 'America/Los_Angeles');
        }
        const hour = dt.hour();
        const fromDt = moment(dt);
        console.log(`getDate: dt=${dt.toDate()} isCurrent=${isCurrent} hour=${hour}`);
        if (isCurrent && hour >= 15) {
            // after school today; get tomorrow
            fromDt.add(1, 'days').startOf('day');
        }

        return fromDt;
    },

    // returns a promise that resolves to an array of lines to say
    forDay(fromDt) {
        // weekend
        const day = fromDt.day();
        const hour = fromDt.hour();
        if (day === 6 || (day === 0 && hour < 12) || (day === 5 && hour >= 15)) {
            return new Promise(function(resolve) {
                resolve(["It's the weekend. Go play."]);
            });
        }
        const toDt = moment(fromDt).add(1, 'days');
        const dayName = getDayName(fromDt);

        return cal.loadEventsFromFile(fromDt, toDt).then(events => toSpeech(dayName, events));
    },
};
