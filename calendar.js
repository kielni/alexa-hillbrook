const ical = require('ical');
const moment = require('moment-timezone');
const AWS = require('aws-sdk');
const rp = require('request-promise');

const s3 = new AWS.S3();
const url = 'https://hillbrook.myschoolapp.com/podium/feed/iCal.aspx?z=Q%2bQ8E04WgcQ8e6RMGhn4rQtO5TFEtZOKzIzn5AmAbleTcLKlyoBEqvSxZKvMOSOxQ8UL%2fDAVwPLT5fs8sm3xqA%3d%3d';

/*
calendar feed returns a list of events:

{ type: 'VEVENT',
  params: [],
  uid: '4865d95d-53b0-41c0-bed4-e73722bd7a3b',
  start: { Wed, 11 May 2016 07:00:00 GMT tz: undefined },
  end: { Thu, 12 May 2016 07:00:00 GMT tz: undefined },
  dtstamp: '20160511T233453',
  summary: 'D Day',
  status: 'CONFIRMED',
  class: 'PUBLIC',
  priority: '3',
  categories: [ 'podium', 'events' ] }

loadEvents returns a promise that resolves with list of events between fromDt and toDt:

{
  start: { Wed, 11 May 2016 07:00:00 GMT tz: undefined },
  end: { Thu, 12 May 2016 07:00:00 GMT tz: undefined },
  summary: 'D Day',
}

*/
const BUCKET = 'alexa-hillbrook';
const FILENAME = 'events.json';

function keepEvent(ev, fromDt, toDt) {
    return !(ev.start < fromDt || ev.start > toDt);
}

module.exports = {
    cacheEvents() {
        const now = moment();

        return this.loadEvents(now, moment().add(7, 'days')).then((ev) => {
            ev.forEach(function(e) {
                if (e.start) {
                    e.start = e.start.toISOString();
                }
                if (e.end) {
                    e.end = e.end.toISOString();
                }
            });
            console.log(`putting ${ev.length} events:\n`, JSON.stringify(ev));

            return s3.putObject({
                Bucket: BUCKET,
                Key: FILENAME,
                Body: JSON.stringify(ev),
                ACL: 'public-read',
                ContentType: 'application/json',
            }).promise();
        });
    },

    loadEventsFromFile(fromDt, toDt) {
        const start = (new Date()).getTime();
        console.log(`start load events from file for ${fromDt.toISOString()} to ${toDt.toISOString()} start=${start}`);
        /*
        return s3.getObject({
            Bucket: BUCKET,
            Key: FILENAME
        }).promise().then(function(data) {
        */
        const s3Url = `https://s3-us-west-1.amazonaws.com/${BUCKET}/${FILENAME}`;

        return rp(s3Url).then(function(data) {
            console.log('got file: ', ((new Date()).getTime() - start));
            // var events = JSON.parse(data.Body).map(function(ev) {
            const events = JSON.parse(data).map((ev) => {
                ev.start = ev.start ? moment(ev.start) : null;
                ev.end = ev.end ? moment(ev.end) : null;

                return ev;
            });
            console.log('parsed file: ', ((new Date()).getTime() - start));
            const keep = [];

            events.forEach(function(ev) {
                if (keepEvent(ev, fromDt, toDt)) {
                    keep.push(ev);
                }
            });
            console.log('filtered events: ', ((new Date()).getTime() - start));

            return keep;
        });
    },

    loadEvents(fromDt, toDt) {
        console.log(`start load events for ${fromDt.toISOString()} to ${toDt.toISOString()}`);

        return rp(url).then((response) => {
            if (!response) {
                return([]);
            }
            const events = [];
            const data = ical.parseICS(response);
            Object.keys(data).forEach((key) => {
                const times = { start: 8, end: -9 };
                // letter days have tz: undefined; set to 8a-3p PT
                // YYYY-MM-DDT07:00:00.000Z  - YYYY-MM-DD+1T07:00:00.000Z
                Object.keys(times).forEach((dtKey) => {
                    let dt = data[key][dtKey];
                    if (dt && !dt.tz) {
                        dt.tz = 'America/Los_Angeles';
                        dt = moment(dt);
                        dt.add('hour', times[dtKey]);
                    }
                    data[key][dtKey] = moment(dt);
                });
                // console.log(data[key]);
                const ev = {
                    start: data[key].start,
                    end: data[key].end,
                    summary: data[key].summary,
                };
                if (!ev.start || !ev.summary) {
                    return;
                }
                if (keepEvent(ev, fromDt, toDt)) {
                    events.push(ev);
                }
            });

            return events;
        });
    },
};
