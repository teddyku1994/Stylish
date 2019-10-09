const connection = require('../database/dbconnect');

module.exports = {

    sqlQuery: (sql,cb) => {
        return new Promise((resolve,reject) => {
            connection.query(sql, (err, result) => {
            if (err) reject(cb(err));
            else resolve(result);
            });
        });
    },
    
}
