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
    max_id = 0,
    depts = [];

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
            closeApp('Error from query ' + syntax.sql + ' -> ' + err);
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
            choices: [
                'View Products for Sale', 'View Low Inventory',
                'Add to Inventory', 'Add New Product', new inquirer.Separator(), 'Exit Application'
            ]
        }
    ]).then(function(answers) {
        //determine which options was selected and go to correct function
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
                getDepartments();
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
    var query = [];
    //determines which query to use
    if (!lowQuantityFlag) {
        query = [
            'SELECT item_id, product_name, price, quantity',
            'FROM products ORDER BY item_id;'
        ].join(' ');
    } else {
        query = [
            'SELECT item_id, product_name, price, quantity',
            'FROM products WHERE quantity<=5 ORDER BY item_id;'
        ].join(' ');
    }

    //query db
    var syntax = connection.query(query, function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql + ' -> ' + err);
        }

        //clear terminal window
        clear();

        //no error but no results returned
        if (resp.length === 0) {
            //inform user and return to menu
            console.log('No results.\n');

            return showMenu();
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
                //Test for a positive integer
                if (!/^[1-9]+[0-9]*$/gi.test(input)) {
                    console.log('\nPlease enter a valid whole number.');
                    return false;
                } else {
                    return true;
                }
            }
        }
    ]).then(function(answers) {
        addInventory(answers);
    }).catch(function(err) {
        closeApp('Error received: ' + err);
    });
}

function addInventory(input) {
    var query = 'UPDATE products SET quantity=quantity+? WHERE item_id=?;',
        id = parseInt(input.id),
        quantity = parseInt(input.quantity);
    
    var syntax = connection.query(query, [quantity, id], function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql + ' -> ' + err);
        }

        console.log('Inventory Added!');

        //provides slight delay in execution so user can see response
        setTimeout(getMaxID, 2000);
    });
}

function getDepartments() {
    var query = [
        'SELECT departments.department_id, department_name FROM departments',
        'ORDER BY department_name;'
    ].join(' ');

    //query db
    var syntax = connection.query(query, function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql + ' -> ' + err);
        }

        depts = [];

        //Get department list
        for(var i=0; i < resp.length; i++) {
            var dept = {
                dept_id: resp[i].department_id,
                dept_name: resp[i].department_name.trim()
            };

            depts.push(dept);
        }

        getNewProduct(depts);
    });
}

function getNewProduct() {
    inquirer.prompt([
        {
            name: 'product',
            type: 'input',
            message: 'Product Name?'
        },
        {
            name: 'department',
            type: 'list',
            message: 'Department?',
            choices: function() { //get department names from array of department objects
                var deptNames = [];

                for (var i = 0; i < depts.length; i++) {
                    deptNames.push(depts[i].dept_name);
                }
    
                return deptNames;
            }
        },
        {
            name: 'price',
            type: 'input',
            message: 'Price?',
            validate: function(input) {
                //Test for currency format
                if (!/^[0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{1,2})?$/gi.test(input)) {
                    console.log('\nPlease enter a valid positive USD amount.');
                    return false;
                } else {
                    return true;
                }
            }
        },
        {
            name: 'quantity',
            type: 'input',
            message: 'Initial Quantity?',
            validate: function(input) {
                //Test for a positive integer
                if (!/^[1-9]+[0-9]*$/gi.test(input)) {
                    console.log('\nPlease enter a valid whole number.');
                    return false;
                } else {
                    return true;
                }
            }
        }
    ]).then(function(answers) {
        addProduct(answers);
    }).catch(function(err) {
        closeApp('Error received: ' + err);
    });
}

function addProduct(input) {
    //get dept id from dept name
    var deptID = depts.filter(function(dept) {
        if (dept.dept_name === input.department) {
            return dept;
        }
    });

    //query was written this way to prevent auto_increment PK
    //from increasing after failed insert
    var query = [
            'INSERT INTO products (product_name, department_id, price,',
            'quantity) SELECT ?, ?, ?, ? WHERE NOT EXISTS ( SELECT * FROM',
            'products WHERE product_name=?);'
        ].join(' '),
        data = [
            input.product.trim(),
            deptID[0].dept_id,
            parseFloat(input.price),
            parseInt(input.quantity),
            input.product.trim()
        ];
    
    var syntax = connection.query(query, data, function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql + ' -> ' + err.code);
        }

        if (resp.affectedRows === 0) {
            console.log(
                'Product not added to database.',
                'Most likely due to a unique key violation caused by a ' +
                'duplicate product name.'
            );

            //provides slight delay in execution so user can see response
            return setTimeout(getMaxID, 5000);
        }
        console.log('Product Added!');

        //provides slight delay in execution so user can see response
        setTimeout(getMaxID, 2000);
    });
}

function closeApp(msg) {
    //log message, end db connection and close app
    console.log(msg);
    connection.end();
    process.exit();
}