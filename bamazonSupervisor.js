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
    });

//Connect to DB
connection.connect(function(err) {
    if (err) {
        //error received, end connection and throw
        closeApp('Error connecting to DB: ' + err);
    }
    
    //connection successful
    //clear terminal and begin application
    clear();
    showMenu();
});

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
                getNewDept();
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
            'overhead_cost, IFNULL(SUM(product_sales),0) AS total_sales, IFNULL(SUM(product_sales),0) - overhead_cost',
            'AS total_profit FROM departments LEFT OUTER JOIN products ON', 'departments.department_id = products.department_id GROUP BY',
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

function getNewDept() {
    inquirer.prompt([
        {
            name: 'name',
            type: 'input',
            message: 'Department Name?'
        },
        {
            name: 'overhead_cost',
            type: 'input',
            message: 'What is the dpeartment\'s overhead cost?',
            validate: function(input) {
                //Test for currency format
                if (!/^[0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{1,2})?$/gi.test(input)) {
                    console.log('\nPlease enter a valid positive USD amount.');
                    return false;
                } else {
                    return true;
                }
            }
        }
    ]).then(function(answers) {
        addDepartment(answers);
    }).catch(function(err) {
        closeApp('Error received: ' + err);
    });
}

function addDepartment(input) {
    //query was written this way to prevent auto_increment PK
    //from increasing after failed insert
    var query = [
            'INSERT INTO departments (department_name, overhead_cost)',
            'SELECT ?, ? WHERE NOT EXISTS ( SELECT * FROM departments',
            'WHERE department_name=?);'
        ].join(' '),
        data = [
            input.name.trim(),
            parseFloat(input.overhead_cost),
            input.name.trim()
        ];
    
    var syntax = connection.query(query, data, function(err, resp) {
        if (err) {
            closeApp('Error from query ' + syntax.sql + ' -> ' + err.code);
        }

        if (resp.affectedRows === 0) {
            console.log(
                'Department not added to database.',
                'Most likely due to a unique key violation caused by a ' +
                'duplicate department name.'
            );

            //provides slight delay in execution so user can see response
            setTimeout(clear, 5000);
            return setTimeout(showMenu, 5000);
        }
        console.log('Department Added!');

        //provides slight delay in execution so user can see response
        setTimeout(clear, 2000);
        setTimeout(showMenu, 2000);
    });
}

function closeApp(msg) {
    //log message, end db connection and close app
    console.log(msg);
    connection.end();
    process.exit();
}