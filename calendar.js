const ical = require('ical');
const moment = require('moment-timezone');
const AWS = require('aws-sdk');
const rp = require('request-promise-native');

const s3 = new AWS.S3();
const url = 'https://hillbrook.myschoolapp.com/podium/feed/iCal.aspx?z=0s%2feotx4yJDlRqdEhJ8zc%2baEu05q%2bFx029HqFcsGumPvnkQUamCwj2qiH4edRKSkQh7IMhAL%2fSxXjFPbmgj4oA%3d%3d';
const DATE_FORMAT_STR = 'YYYY-MM-DD HH:mm';

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
        const now = moment().tz('America/Los_Angeles');

        return this.loadEvents(now, moment().add(7, 'days')).then((ev) => {
            ev.forEach(function(e) {
                console.log(`${e.summary}\t${e.start}\t${e.end}`);
                if (e.start) {
                    e.start = e.start.format(DATE_FORMAT_STR);
                }
                if (e.end) {
                    e.end = e.end.format(DATE_FORMAT_STR);
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
        const s3Url = `https://s3-us-west-1.amazonaws.com/${BUCKET}/${FILENAME}`;
        const fromDtStr = fromDt.format(DATE_FORMAT_STR);
        const toDtStr = toDt.format(DATE_FORMAT_STR);

        console.log(`start load events from file for ${fromDtStr} to ${toDtStr} start=${start}`);

        return rp(s3Url).then((data) => {
            const events = JSON.parse(data).filter(ev => keepEvent(ev, fromDtStr, toDtStr));

            return events.map((ev) => {
                ev.start = moment(ev.start);
                ev.end = moment(ev.end);

                return ev;
            });
        });
    },

    loadEvents(fromDt, toDt) {
        console.log(`start load events for ${fromDt.toISOString()} to ${toDt.toISOString()}`);
        console.log(url);

        return rp(url).then((response) => {
            if (!response) {
                return([]);
            }
            const events = [];
            const data = ical.parseICS(response);

            Object.keys(data).forEach((key) => {
                // start: { 2019-08-26T10:00:00.000Z tz: 'America/Los_Angeles' },
                // end: { 2019-08-26T11:00:00.000Z tz: 'America/Los_Angeles' },
                ['start', 'end'].forEach((dtKey) => {
                    const dt = data[key][dtKey];
                    if (!dt) {
                        return;
                    }
                    // ignore timezone complexity; everything is in school-local time
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
