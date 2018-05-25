const Promise = require('bluebird');
const data = require('./mock-data.json');

function getGrades(userId) {
    return data[userId] && data[userId].grades ? data[userId].grades : [];
}

module.exports = {
    label: 'mock',

    get(userId) {
        console.log(`mock-db.get ${userId}`);

        return new Promise(resolve => resolve(getGrades(userId)));
    },

    add(userId, grade) {
        console.log(`mock-db.add ${userId} grade=${grade}`);

        return new Promise((resolve) => {
            const grades = getGrades(userId);

            resolve({ grades, added: grades.indexOf(grade) >= 0 ? null : grade });
        });
    },

    remove(userId, grade) {
        console.log(`mock-db.remove ${userId} grade=${grade}`);

        return new Promise((resolve) => {
            const grades = getGrades(userId);

            resolve({ grades, removed: grades.indexOf(grade) >= 0 ? grade : null });
        });
    },
};
