var firebase = require('firebase');
var config = require('./config.json');

firebase.initializeApp({
    serviceAccount: {
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey
    },
    databaseURL: config.databaseURL
});

/*
    userGrades: {
        user1: {
            grades: [1, 3],
        }
        user2: {
            grades: [2]
        }
    }
*/

function keyify(userId) {
    return userId.replace(/\W+/g, '_');
}

module.exports = {
    label: 'firebase',

    get: function(userId) {
        var uid = keyify(userId);
        var userRef = firebase.database().ref('/userGrades/'+uid);
        return userRef.once('value').then(function(snapshot) {
            return snapshot.val();
        });
    },

    add: function(userId, grade) {
        var uid = keyify(userId);
        // always save as string to match type in day messages
        grade = grade+'';
        console.log('firebase.add '+userId+' grade '+grade);
        var userRef = firebase.database().ref('/userGrades/'+uid);
        return userRef.once('value').then(function(snapshot) {
            var user = snapshot.val();
            var grades = user && user.grades ? user.grades : [];
            var isNew = grades.indexOf(grade) < 0;
            var ret = {};
            if (isNew) {
                grades.push(grade);
                ret.added = grade;
            }
            userRef.set({grades: grades});
            ret.grades = grades;
            console.log('returning ', ret);
            return ret;
        });
    },

    remove: function(userId, grade) {
        var uid = keyify(userId);
        // always save as string to match type in day messages
        grade = grade+'';
        console.log('firebase.remove '+userId+' grade '+grade);
        var userRef = firebase.database().ref('/userGrades/'+uid);
        return userRef.once('value').then(function(snapshot) {
            var user = snapshot.val();
            var grades = user && user.grades ? user.grades : [];
            var ret = {};
            var idx = grades.indexOf(grade);
            if (idx >= 0) {
                grades.splice(idx, 1);
                ret.removed = grade;
            }
            userRef.set({grades: grades});
            ret.grades = grades;
            console.log('returning ', ret);
            return ret;
        });
    }
};
