var cal = require('./calendar');
var moment = require('moment');

var now = moment();
var fromDt = moment().startOf('day');
console.log('now.hour='+now.hour());
if (now.hour() >= 12) {
    fromDt.add(1, 'days');
}
var toDt = moment(fromDt).add(1, 'days');

cal.loadEvents(fromDt.toDate(), toDt.toDate(), function(){});
