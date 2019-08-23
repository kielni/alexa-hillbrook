const moment = require('moment-timezone');
const cal = require('./calendar');
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

function toSpeech(dayName, events) {
    /*
    { start: { Fri, 13 May 2016 07:00:00 GMT tz: undefined },
      end: { Sat, 14 May 2016 07:00:00 GMT tz: undefined },
      summary: 'F Day' }
    { start: { Fri, 13 May 2016 18:30:00 GMT tz: 'America/Los_Angeles' },
      end: { Fri, 13 May 2016 21:30:00 GMT tz: 'America/Los_Angeles' },
      summary: 'All School Walkathon' }
    */
    console.log(`toSpeech: loaded ${events.length} events`);
    if (!events || !events.length) {
        return(['Nothing going on.']);
    }

    const now = moment.tz(moment(), 'America/Los_Angeles');
    const noSchool = new RegExp(/no school/i);
    const say = [];

    events.forEach((ev) => {
        if (ev.summary.match(noSchool)) {
            say.push([`No school ${ev.start.format('dddd')}.`]);

            return;
        }

        let verb = ev.start.isAfter(now) ? 'is' : 'was';
        // & is invalid ssml
        ev.summary = ev.summary.replace(new RegExp('&', 'g'), 'and');
        // don't say time for all-day events
        if (ev.end.diff(ev.start, 'day') === 1) {
            // all day events start at midnight UTC (4/5pm PT previous day)
            verb = 'is';
            if (dayName === 'today' || dayName === 'tomorrow') {
                say.push(`${dayName} ${verb} ${ev.summary}`);
            } else {
                say.push(`It's ${ev.summary}.`);
            }
        } else {
            // 2pm or 2:30pm
            const format = ev.start.minute() === 0 ? 'hA' : 'h:mmA';
            say.push(`${ev.summary} ${verb} at ${ev.start.format(format)}.`);
        }
    });

    console.log(`hour=${now.hour()} dayName=${dayName}`);

    return say.map(line => line[0].toUpperCase() + line.slice(1));
}

module.exports = {
    getDate(dt) {
        const isCurrent = dt === null;
        if (!dt) {
            dt = moment().tz('America/Los_Angeles');
        }
        const hour = dt.hour();
        const fromDt = moment(dt);
        console.log(`getDate: dt=${dt.format('YYYY-MM-DD HH:mm')} isCurrent=${isCurrent} hour=${hour}`);
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
                resolve(["It's the weekend. <break strength=\"medium\" /> Go play."]);
            });
        }
        const toDt = moment(fromDt).endOf('day');
        const dayName = getDayName(fromDt);

        return cal.loadEventsFromFile(fromDt, toDt).then(events => toSpeech(dayName, events));
    },
};
