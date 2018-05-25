const cal = require('./calendar');
const moment = require('moment');

// cal.cacheEvents();
/*
var now = moment();
var fromDt = moment().startOf('day');
console.log('now.hour='+now.hour());
if (now.hour() >= 12) {
    fromDt.add(1, 'days');
}
var toDt = moment(fromDt).add(1, 'days');

cal.loadEvents(fromDt.toDate(), toDt.toDate()).then(function(resp) {
    console.log('then resp=', resp);
});
*/
cal.loadEventsFromFile(moment(), moment().add(1, 'day')).then(function(data) {
    console.log(data);
});
