var ical = require('ical');

var url = 'https://hillbrook.myschoolapp.com/podium/feed/iCal.aspx?q=4F7E8A1EB007DDCF38EB65C42638FAF0539D63B3F3E197D0D7F3AA50A8C759454E2A6411EE2EA89A5A3F62462239449017183CC0C7763E5F';

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

loadEvents returns a list of events between fromDt and toDt:

{
  start: { Wed, 11 May 2016 07:00:00 GMT tz: undefined },
  end: { Thu, 12 May 2016 07:00:00 GMT tz: undefined },
  summary: 'D Day',
}

*/
var calendar = {
    loadEvents: function(fromDt, toDt, callback) {
        var events = [];
        console.log('loading events for '+fromDt+' to '+toDt+' from='+url);
        ical.fromURL(url, {}, function(err, data) {
            console.log('got events: err=', err);
            console.log('data=', data);
            if (!data) {
                callback(err, events);
                return;
            }
            console.log('loaded '+data.length+' events');
            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    var ev = data[k];
                    if (ev.start >= fromDt && ev.start < toDt) {
                        var details = {
                            start: ev.start,
                            end: ev.end,
                            summary: ev.summary
                        };
                        events.push(details);
                    }
                }
            }
            callback(null, events);
        });
    }
};

module.exports = calendar;
