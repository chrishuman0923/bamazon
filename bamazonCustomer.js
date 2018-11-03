require('dotenv').config();

var keys = require('./keys'),
    inquirer = require('inquirer'),
    cTable = require('console.table'),
    mySQL = require('mysql'),
    connection = mySQL.createConnection({
        host: 'localhost',
        user: 'root',
        password: keys.mySQL.password,
        database: 'bamazon'
    });

//Connect to DB
connection.connect(function(err) {
    if (err) {
        //error received, end connection and throw
        connection.end();
        return console.error('Error connecting to DB: ' + err);
    }
    
    //connection successful, begin application
    showAllProducts();
});

function showAllProducts() {
    var query = 'SELECT item_id, product_name, price FROM products ORDER BY item_id;';

    var syntax = connection.query(query, function(err, resp) {
        if (err) {
            return console.log('Error from query ' + syntax.sql);
        }

        //Create array to hold formatted products
        var products = [];

        //Loop through rows in DB table
        for(var i = 0; i < resp.length; i++) {
            //Create new object
            var product = {
                ID: resp[i].item_id,
                Name: resp[i].product_name,
                'Price ($)': resp[i].price.toFixed(2) //formats decimal to 2 decimal places
            };

            //Pushes product object to new array
            products.push(product);
        }

        //formats the consoled array to look like a table
        console.table(products);

        //get user input on which item they want to buy
        itemToBuyInput();
    });
}

function itemToBuyInput() {

}