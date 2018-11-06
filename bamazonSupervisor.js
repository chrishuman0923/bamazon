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
                'View Products Sales by Department', 'Create New Department', new inquirer.Separator(), 'Exit Application'
            ]
        }
    ]).then(function(answers) {
        //determine which options was selected and go to correct function
        switch (answers.action) {
            case 'View Products Sales by Department':
                viewDeptStats();
                break;
            case 'Create New Department':
                newDepartment();
                break;
            default:
                clear();
                closeApp('Goodbye!');
        }
    }).catch(function(err) {
        closeApp('Error received: ' + err);
    });
}

function viewDeptStats() {
    var query = [
            'SELECT departments.department_id, departments.department_name,',
            'overhead_cost, SUM(product_sales) AS total_sales, SUM(product_sales) - overhead_cost',
            'AS total_profit FROM products INNER JOIN departments ON', 'products.department_id = departments.department_id GROUP BY',
            'departments.department_id, departments.department_name,', 'departments.overhead_cost ORDER BY departments.department_id;'
        ].join(' ');

    //query db
    var syntax = connection.query(query, function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql + ' -> ' + err);
        }

        //Create array to hold formatted products
        var departments = [];

        //Loop through rows in DB table
        for(var i = 0; i < resp.length; i++) {
            //Create new object
            var department = {
                ID: resp[i].department_id,
                Name: resp[i].department_name,
                'Overhead Cost': new Intl.NumberFormat('en-EN', {
                    style: 'currency',
                    currency: 'USD'
                }).format(resp[i].overhead_cost), //formats as currency
                'Total Sales': new Intl.NumberFormat('en-EN', {
                    style: 'currency',
                    currency: 'USD'
                }).format(resp[i].total_sales),
                'Total Profit': new Intl.NumberFormat('en-EN', {
                    style: 'currency',
                    currency: 'USD'
                }).format(resp[i].total_profit)
            };

            //Pushes product object to new array
            departments.push(department);
        }

        //formats the consoled array to look like a table
        console.table(departments);

        //back to menu
        showMenu();
    });
}

function closeApp(msg) {
    //log message, end db connection and close app
    console.log(msg);
    connection.end();
    process.exit();
}