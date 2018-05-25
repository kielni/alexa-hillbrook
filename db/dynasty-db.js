var dynasty = require('dynasty')({});
var userGradeTable = dynasty.table('user_grade');

module.exports = {
    label: 'dynasty',

    get: function(userId) {
        console.log(`dynasty-db.get ${userId}`);
        /*
            { grades: [ '2' ], userId: 'amzn1.ask.account.ABCDEF' }
        */

        return userGradeTable.find(userId).then(resp => resp ? resp.grades : null);
    },

    add: function(userId, grade) {
        console.log(`dynasty-db.add ${userId} grade ${grade}`);

        return userGradeTable.find(userId).then((response) => {
            console.log('dynasty-db.add got response ', response);
            if (response && response.grades) {
                const grades = response.grades || [];

                if (grades.indexOf(grade) >= 0) {
                    console.log(`${userId} already has grade ${grade}`);

                    return { grades };
                }
                grades.push(grade);
                console.log(`updating grades for ${userId} to ${grades}`);

                return userGradeTable.update(userId, { grades }).then(() => {
                    console.log('update.then grades=', grades);

                    return { grades, added: grade };
                });
            }
            console.log(`setting grades for ${userId} to ${[grade]}`);

            return userGradeTable.insert({ userId, grades: [grade] }).then(() => {
                console.log('insert.then grades=', [grade]);

                return { grades: [grade], added: grade };
            });
        });
    },

    remove: function(userId, grade) {

        return userGradeTable.find(userId).then((response) => {
            console.log('dynasty-db.remove got response ', response);
            if (!response || !response.grades) {
                console.log(`no grades for user ${userId}`);

                return { grades: [] };
            }

            let grades = response && response.grades ? response.grades : [];
            const idx = grades.indexOf(grade);

            if (idx < 0) {
                console.log(`user ${userId} does not have grade ${grade}`);

                return { grades };
            }
            if (grades.length === 1) {
                console.log(`removing record for ${userId}`);

                return userGradeTable.remove(userId).then(() => {
                    return { grades: [], removed: grade };
                });
            }
            grades = grades.splice(idx, 1);
            console.log(`setting grades for ${userId} to `, grades);

            return userGradeTable.update(userId, {grades: grades}).then(() => {
                return { grades, removed: grade };
            });
        });
    },
};
