require('dotenv').config();

const inquirer = require('inquirer');
const cTable = require('console.table');
const clear = require('clear');
const mySQL = require('mysql');
const keys = require('./keys');

const connection = mySQL.createConnection({
  host: 'localhost',
  user: 'root',
  password: keys.mySQL.password,
  database: 'bamazon',
});

// Connect to DB
connection.connect((err) => {
  if (err) {
    // error received, end connection and throw
    return closeApp(`Error connecting to DB: ${err}`);
  }

  // connection successful
  // clear terminal and begin application
  clear();
  return showMenu();
});

const showMenu = () => {
  inquirer.prompt([
    {
      name: 'action',
      type: 'list',
      message: 'What would you like to do?',
      choices: [
        'View Sales by Department', 'Create New Department',
        new inquirer.Separator(), 'Exit Application',
      ],
    },
  ]).then((answers) => {
    // determine which options was selected and go to correct function
    switch (answers.action) {
      case 'View Sales by Department':
        viewDeptStats();
        break;
      case 'Create New Department':
        getNewDept();
        break;
      default:
        clear();
        closeApp('Goodbye!');
    }
  }).catch((err) => {
    closeApp(`Error received: ${err}`);
  });
};

const viewDeptStats = () => {
  const query = [
    'SELECT departments.department_id, departments.department_name,overhead_cost,',
    'IFNULL(SUM(product_sales),0) AS total_sales, IFNULL(SUM(product_sales),0)-overhead_cost',
    'AS total_profit FROM departments LEFT OUTER JOIN products ON', 'departments.department_id',
    '= products.department_id GROUP BY departments.department_id, departments.department_name,', 'departments.overhead_cost ORDER BY departments.department_id;',
  ].join(' ');

  // query db
  const syntax = connection.query(query, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    // Create array to hold formatted products
    const departments = [];

    // Loop through rows in DB table
    resp.forEach((row) => {
      // Create new object
      const department = {
        ID: row.department_id,
        Name: row.department_name,
        // formats as currency
        'Overhead Cost': new Intl.NumberFormat('en-EN', {
          style: 'currency',
          currency: 'USD',
        }).format(row.overhead_cost),
        'Total Sales': new Intl.NumberFormat('en-EN', {
          style: 'currency',
          currency: 'USD',
        }).format(row.total_sales),
        'Total Profit': new Intl.NumberFormat('en-EN', {
          style: 'currency',
          currency: 'USD',
        }).format(row.total_profit),
      };

      // Pushes product object to new array
      departments.push(department);
    });

    // formats the consoled array to look like a table
    console.table(departments);

    // back to menu
    showMenu();
  });
};

const getNewDept = () => {
  inquirer.prompt([
    {
      name: 'name',
      type: 'input',
      message: 'Department Name?',
    },
    {
      name: 'overhead_cost',
      type: 'input',
      message: 'What is the department\'s overhead cost?',
      validate(input) {
        // Test for currency format
        if (!/^[0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{1,2})?$/gi.test(input)) {
          console.log('\nPlease enter a valid positive USD amount.');
          return false;
        }
        return true;
      },
    },
  ]).then((answers) => {
    addDepartment(answers);
  }).catch((err) => {
    closeApp(`Error received: ${err}`);
  });
};

const addDepartment = (input) => {
  // query was written this way to prevent auto_increment PK
  // from increasing after failed insert
  const query = [
    'INSERT INTO departments (department_name, overhead_cost)',
    'SELECT ?, ? WHERE NOT EXISTS ( SELECT * FROM departments',
    'WHERE department_name=?);',
  ].join(' ');
  const data = [
    input.name.trim(),
    parseFloat(input.overhead_cost),
    input.name.trim(),
  ];

  const syntax = connection.query(query, data, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err.code}`);
    }

    if (resp.affectedRows === 0) {
      console.log(
        'Department not added to database.',
        'Most likely due to a unique key violation caused by a '
                + 'duplicate department name.',
      );

      // provides slight delay in execution so user can see response
      setTimeout(clear, 5000);
      return setTimeout(showMenu, 5000);
    }
    console.log('Department Added!');

    // provides slight delay in execution so user can see response
    setTimeout(clear, 5000);
    setTimeout(showMenu, 5000);
  });
};

const closeApp = (msg) => {
  // log message, end db connection and close app
  console.log(msg);
  connection.end();
  process.exit();
};
