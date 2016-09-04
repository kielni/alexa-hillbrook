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

var db = firebase.database();

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

function userRef(userId) {
    return db.ref('/userGrades/' + userId);
}

function keyify(userId) {
    return userId.replace(/\W+/g, '_');
}

module.exports = {
    label: 'dynasty',

    get: function(userId) {
        var uid = keyify(userId);
        console.log('firebase.get '+userId+' uid=', uid);
        return userRef(uid).once('value').then(function(snapshot) {
            console.log('value', snapshot.val());
            return snapshot.val();
        });
    },

    add: function(userId, grade) {
        var uid = keyify(userId);
        // always save as string to match type in day messages
        grade = grade+'';
        console.log('firebase.add '+userId+' grade '+grade);
        this.get(uid).then(function(val) {
            console.log('got val', val);
            var grades = val && val.grades ? val.grades : [];
            console.log('grades=', grades);
            var isNew = grades.indexOf(grade) < 0;
            var ret = {};
            if (isNew) {
                grades.push(grade);
                ret.added = grade;
            }
            console.log('setting /userGrades/' + uid + ' to ', grades);
            userRef(uid).set({grades: grades}).then(() => {
                console.log('done set');
            });
            ret.grades = grades;
            console.log('returning ', ret);
            return ret;
        });
    },

    remove: function(userId, grade) {
        var uid = keyify(userId);
        // always save as string to match type in day messages
        grade = grade+'';
        this.get(uid).then(function(val) {
            console.log('got val', val);
            var grades = val && val.grades ? val.grades : [];
            console.log('grades=', grades);
            var ret = {};
            var idx = grades.indexOf(grade);
            if (idx >= 0) {
                grades.splice(idx, 1);
                ret.removed = grade;
            }
            console.log('setting /userGrades/' + uid + ' to ', grades);
            userRef(uid).set({grades: grades});
            ret.grades = grades;
            console.log('returning ', ret);
            return ret;
        });
    }
};
