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

        //begin application
        showAllProducts();
    });
}

function showAllProducts() {
    var query = 'SELECT item_id, product_name, price FROM products ORDER BY item_id;';

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
                Price: '$ ' + resp[i].price.toFixed(2) //formats decimal to 2 decimal places
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
    //get user input
    inquirer.prompt([
        {
            name: 'id',
            type: 'input',
            message: 'Which item would you like to purchase (Enter ID or q to exit)?',
            validate: function(input) {
                //validation to determine if the id exists
                if (input.trim().toLowerCase() === 'q') {
                    closeApp('\nGoodbye!\n');
                } else if (!/^[1-9]+[0-9]*$/gi.test(input) || input > max_id) {
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
            message: 'Enter the quantity you would like to purchase?',
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
        checkInventory(answers);
    }).catch(function(err) {
        closeApp('Error received: ' + err);
    });
}

function checkInventory(input) {
    var query = 'SELECT quantity FROM products WHERE item_id=? LIMIT 1;',
        id = parseInt(input.id),
        quantity = parseInt(input.quantity);
    
    //query db
    var syntax = connection.query(query, [id], function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql);
        }

        //is there enough inventory for what was requested
        if (quantity > resp[0].quantity) {
            //no...restart application so user can decide again
            console.log('\nInsufficient quantity in stock!\n');

            //provides slight delay in execution so user can see response
            setTimeout(getMaxID, 2000);
        } else {
            purchaseItem(id, quantity);
        }
    });
}

function purchaseItem(id, quantity) {
    var query = 'UPDATE products SET quantity=quantity-? WHERE item_id=?;';
    
    var syntax = connection.query(query, [quantity, id], function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql);
        }

        showTotalCost(id, quantity);
    });
}

function showTotalCost(id, quantity) {
    var query = 'SELECT price FROM products WHERE item_id=? LIMIT 1;',
        totalCost = 0;

    var syntax = connection.query(query, [id], function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql);
        }

        //get total cost
        totalCost = (resp[0].price * quantity).toFixed(2);

        //display total cost message
        console.log('\nYour total cost was $ ' + totalCost + '\n');

        //provides slight delay in execution so user can see response
        setTimeout(getMaxID, 2000);
    });
}

function closeApp(msg) {
    console.log(msg);
    connection.end();
    process.exit();
}