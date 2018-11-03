require('dotenv').config();

var keys = require('./keys'),
    inquirer = require('inquirer'),
    mySQL = require('mysql'),
    connection = mySQL.createConnection({
        host: 'localhost',
        user: 'root',
        password: keys.mySQL.password,
        database: 'bamazon'
    });

connection.connect(function(err) {
    if (err) {
        //error received, end connection and throw
        connection.end();
        return console.error('Error connecting to DB: ' + err);
    }
    
    //connection successful
    console.log('Connected to DB as id ' + connection.threadId);
});