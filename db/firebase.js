var firebase = require('firebase');
var config = require('./config.json');

firebase.initializeApp({
    serviceAccount: {
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
    },
    databaseURL: config.databaseURL,
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
        const start = (new Date()).getTime();
        console.log('start db.get', start);
        const uid = keyify(userId);
        const userRef = firebase.database().ref(`/userGrades/${uid}`);

        return userRef.once('value').then((snapshot) => {
            console.log('done db.get', ((new Date()).getTime() - start));

            return snapshot.val();
        });
    },

    add: function(userId, grade) {
        const uid = keyify(userId);
        // always save as string to match type in day messages
        grade = grade+'';
        console.log(`firebase.add ${userId} grade ${grade}`);
        const userRef = firebase.database().ref(`/userGrades/${uid}`);

        return userRef.once('value').then((snapshot) => {
            const user = snapshot.val();
            const grades = user && user.grades ? user.grades : [];
            const isNew = grades.indexOf(grade) < 0;
            const ret = {};
            if (isNew) {
                grades.push(grade);
                ret.added = grade;
            }
            userRef.set({ grades });
            ret.grades = grades;
            console.log('returning ', ret);

            return ret;
        });
    },

    remove: function(userId, grade) {
        const uid = keyify(userId);
        // always save as string to match type in day messages
        grade = grade+'';
        console.log(`firebase.remove ${userId} grade ${grade}`);
        const userRef = firebase.database().ref(`/userGrades/${uid}`);

        return userRef.once('value').then((snapshot) => {
            const user = snapshot.val();
            const grades = user && user.grades ? user.grades : [];
            const ret = {};
            const idx = grades.indexOf(grade);

            if (idx >= 0) {
                grades.splice(idx, 1);
                ret.removed = grade;
            }
            userRef.set({ grades });
            ret.grades = grades;
            console.log('returning ', ret);

            return ret;
        });
    },
};
