var dynasty = require('dynasty')({});
var userGradeTable = dynasty.table('user_grade');

module.exports = {
    label: 'dynasty',

    get: function(userId) {
        console.log('dynasty-db.get '+userId);
        /*
            { grades: [ '2' ], userId: 'amzn1.ask.account.ABCDEF' }
        */
        return userGradeTable.find(userId).then(function(resp) {
            return resp ? resp.grades : null;
        });
    },

    add: function(userId, grade) {
        console.log('dynasty-db.add '+userId+' grade '+grade);
        return userGradeTable.find(userId).then(function(response) {
            console.log('dynasty-db.add got response ', response);
            if (response && response.grades) {
                if (response.grades.indexOf(grade) >= 0) {
                    console.log(userId+' already has grade '+grade);
                    return {'grades': response.grades};
                }
                var grades = response.grades || [];
                grades.push(grade);
                console.log('updating grades for '+userId+' to ', grades);
                return userGradeTable.update(userId, {grades: grades}).then(function() {
                    console.log('update.then grades=', grades);
                    return {'grades': grades, 'added': grade};
                });
            } else {
                console.log('setting grades for '+userId+' to ', [grade]);
                return userGradeTable.insert({userId: userId, grades: [grade]}).then(function() {
                    console.log('insert.then grades=', [grade]);
                    return {'grades': grades, 'added': grade};
                });
            }
        });
    },

    remove: function(userId, grade) {
        return userGradeTable.find(userId).then(function(response) {
            console.log('dynasty-db.remove got response ', response);
            var grades = response.grades || [];
            if (!grades) {
                console.log('no grades for user '+userId);
                return null;
            }
            var idx = grades.indexOf(grade);
            if (idx < 0) {
                console.log('user '+userId+' does not have grade '+grade);
                return {'grades': grades};
            }
            if (grades.length === 1) {
                console.log('removing record for '+userId);
                return userGradeTable.remove(userId).then(function() {
                    return {'grades': grades, 'removed': grade};
                });
            }
            grades = grades.splice(idx, 1);
            console.log('setting grades for '+userId+' to ', grades);
            return userGradeTable.update(userId, {grades: grades}).then(function() {
                return {'grades': grades, 'removed': grade};
            });
        });
    }
};
