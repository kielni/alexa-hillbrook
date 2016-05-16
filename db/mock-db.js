var Promise = require('bluebird'),
    data = require('./mock-data.json');

module.exports = {
    label: 'mock',

    get: function(userId) {
        console.log('mock-db.get '+userId);
        return new Promise(function(resolve) {
            return resolve(data[userId].grades);
        });
    },

    add: function(userId, grade) {
        console.log('mock-db.add '+userId+' grade='+grade);
        return new Promise(function(resolve) {
            var grades = data[userId] && data[userId].grades ? data[userId].grades : [];
            grades.push(grade);
            resolve(grades);
        });
    },

    remove: function(userId, grade) {
        console.log('mock-db.remove '+userId+' grade='+grade);
        return new Promise(function(resolve) {
            var grades = data[userId] && data[userId].grades ? data[userId].grades : [];
            var idx = grades.indexOf(grade);
            if (idx >= 0) {
                grades = grades.splice(idx, 1);
            }
            return resolve(grades);
        });
    }
};
