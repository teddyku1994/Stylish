const mysql = require('mysql');

// Connection to database

const connection = mysql.createPool({
    connectionLimit : 10,
    host     : 'DB HOST',
    user     : 'DB USER',
    password : 'DB PW',
    database : 'DB'
});
  
  
connection.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.log('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.log('Database connection was refused.');
        }
        if (connection) connection.release();
        return
    }
});

  module.exports = connection;