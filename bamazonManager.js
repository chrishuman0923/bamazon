require('dotenv').config();

var keys = require('./keys'),
    inquirer = require('inquirer'),
    cTable = require('console.table'),
    clear = require('clear'),
    mySQL = require('mysql'),
    connection = mySQL.createConnection({
        host: 'localhost',
        user: 'root',
        password: keys.mySQL.password,
        database: 'bamazon'
    }),
    max_id = 0;

//Connect to DB
connection.connect(function(err) {
    if (err) {
        //error received, end connection and throw
        closeApp('Error connecting to DB: ' + err);
    }
    
    //connection successful
    getMaxID();
});

function getMaxID() {
    var query = 'SELECT MAX(item_id) AS max_id FROM products;';

    //query db
    var syntax = connection.query(query, function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql);
        }

        //set client-side variable of the max id in the database
        max_id = resp[0].max_id;

        //clear terminal and begin application
        clear();
        showMenu();
    });
}

function showMenu() {
    inquirer.prompt([
        {
            name: 'action',
            type: 'list',
            message: 'What would you like to do?',
            choices: ['View Products for Sale', 'View Low Inventory', 'Add to Inventory', 'Add New Product', 'Exit Application']
        }
    ]).then(function(answers) {
        switch (answers.action) {
            case 'View Products for Sale':
                showProducts(false);
                break;
            case 'View Low Inventory':
                showProducts(true);
                break;
            case 'Add to Inventory':
                itemToAddInventory();
                break;
            case 'Add New Product':
                break;
            default:
                clear();
                closeApp('Goodbye!');
        }
    }).catch(function(err) {
        closeApp('Error received: ' + err);
    });
}

function showProducts(lowQuantityFlag) {
    var query;

    //determines which query to use
    if (!lowQuantityFlag) {
        query = 'SELECT item_id, product_name, price, quantity FROM products ORDER BY item_id;';
    } else {
        query = 'SELECT item_id, product_name, price, quantity FROM products WHERE quantity<=5 ORDER BY item_id;';
    }

    //query db
    var syntax = connection.query(query, function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql);
        }

        //Create array to hold formatted products
        var products = [];

        //Loop through rows in DB table
        for(var i = 0; i < resp.length; i++) {
            //Create new object
            var product = {
                ID: resp[i].item_id,
                Name: resp[i].product_name,
                Price: new Intl.NumberFormat('en-EN', {
                    style: 'currency',
                    currency: 'USD'
                }).format(resp[i].price), //formats as currency
                Quantity: resp[i].quantity
            };

            //Pushes product object to new array
            products.push(product);
        }

        //clear terminal window
        clear();

        //formats the consoled array to look like a table
        console.table(products);

        //back to menu
        showMenu();
    });
}

function itemToAddInventory() {
    //get user input
    inquirer.prompt([
        {
            name: 'id',
            type: 'input',
            message: 'Add inventory for which item (Enter ID)?',
            validate: function(input) {
                //validation to determine if the id exists
                if (!/^[1-9]+[0-9]*$/gi.test(input) || input > max_id) {
                    console.log('\nPlease enter a valid ID.');
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            name: 'quantity',
            type: 'input',
            message: 'Enter the quantity you would like to add?',
            validate: function(input) {
                if (!/^[1-9]+[0-9]*$/gi.test(input)) {
                    console.log('\nPlease enter a valid whole number.');
                    return false;
                } else {
                    return true;
                }
            }
        }
    ]).then(function(answers) {
        console.log(answers);
    }).catch(function(err) {
        closeApp('Error received: ' + err);
    });
}

function closeApp(msg) {
    //log message, end db connection and close app
    console.log(msg);
    connection.end();
    process.exit();
}