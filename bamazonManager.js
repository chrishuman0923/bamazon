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

let maxID = 0;
let depts = [];

// Connect to DB
connection.connect((err) => {
  if (err) {
    // error received, end connection and throw
    return closeApp(`Error connecting to DB: ${err}`);
  }

  // connection successful
  getMaxID();
});

const getMaxID = () => {
  const query = 'SELECT MAX(item_id) AS maxID FROM products;';

  // query db
  const syntax = connection.query(query, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    // set client-side variable of the max id in the database
    maxID = resp[0].maxID;

    // clear terminal and begin application
    clear();
    showMenu();
  });
};

const showMenu = () => {
  inquirer.prompt([
    {
      name: 'action',
      type: 'list',
      message: 'What would you like to do?',
      choices: [
        'View Products for Sale', 'View Low Inventory',
        'Add to Inventory', 'Add New Product', new inquirer.Separator(),
        'Exit Application',
      ],
    },
  ]).then((answers) => {
    // determine which options was selected and go to correct function
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
  }).catch(err => closeApp(`Error received: ${err}`));
};

const showProducts = (lowQuantityFlag) => {
  let query = [];
  // determines which query to use
  if (!lowQuantityFlag) {
    query = [
      'SELECT item_id, product_name, price, quantity',
      'FROM products ORDER BY item_id;',
    ].join(' ');
  } else {
    query = [
      'SELECT item_id, product_name, price, quantity',
      'FROM products WHERE quantity<=5 ORDER BY item_id;',
    ].join(' ');
  }

  // query db
  const syntax = connection.query(query, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    // clear terminal window
    clear();

    // no error but no results returned
    if (resp.length === 0) {
      // inform user and return to menu
      console.log('No results.\n');

      return showMenu();
    }

    // Create array to hold formatted products
    const products = [];

    // Loop through rows in DB table
    resp.forEach((row) => {
      // Create new object
      const product = {
        ID: row.item_id,
        Name: row.product_name,
        Price: new Intl.NumberFormat('en-EN', {
          style: 'currency',
          currency: 'USD',
        }).format(row.price), // formats as currency
        Quantity: row.quantity,
      };

      // Pushes product object to new array
      products.push(product);
    });

    // formats the consoled array to look like a table
    console.table(products);

    // back to menu
    showMenu();
  });
};

const itemToAddInventory = () => {
  // get user input
  inquirer.prompt([
    {
      name: 'id',
      type: 'input',
      message: 'Add inventory for which item (Enter ID)?',
      validate(input) {
        // validation to determine if the id exists
        if (!/^[1-9]+[0-9]*$/gi.test(input) || input > maxID) {
          console.log('\nPlease enter a valid ID.');
          return false;
        }
        return true;
      },
    },
    {
      name: 'quantity',
      type: 'input',
      message: 'Enter the quantity you would like to add?',
      validate(input) {
        // Test for a positive integer
        if (!/^[1-9]+[0-9]*$/gi.test(input)) {
          console.log('\nPlease enter a valid whole number.');
          return false;
        }
        return true;
      },
    },
  ]).then((answers) => {
    addInventory(answers);
  }).catch((err) => {
    return closeApp(`Error received: ${err}`);
  });
};

const addInventory = (input) => {
  const query = 'UPDATE products SET quantity=quantity+? WHERE item_id=?;';
  const id = Number(input.id);
  const quantity = Number(input.quantity);

  const syntax = connection.query(query, [quantity, id], (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    console.log('Inventory Added!');

    // provides slight delay in execution so user can see response
    setTimeout(getMaxID, 5000);
  });
};

const getDepartments = () => {
  const query = [
    'SELECT departments.department_id, department_name FROM departments',
    'ORDER BY department_name;',
  ].join(' ');

  // query db
  const syntax = connection.query(query, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    depts = [];

    // Get department list
    resp.forEach((row) => {
      const dept = {
        dept_id: row.department_id,
        dept_name: row.department_name.trim(),
      };

      depts.push(dept);
    });

    getNewProduct(depts);
  });
};

const getNewProduct = () => {
  inquirer.prompt([
    {
      name: 'product',
      type: 'input',
      message: 'Product Name?',
    },
    {
      name: 'department',
      type: 'list',
      message: 'Department?',
      choices() { // get department names from array of department objects
        const deptNames = [];

        depts.forEach(dept => deptNames.push(dept.dept_name));

        return deptNames;
      },
    },
    {
      name: 'price',
      type: 'input',
      message: 'Price?',
      validate(input) {
        // Test for currency format
        if (!/^[0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{1,2})?$/gi.test(input)) {
          console.log('\nPlease enter a valid positive USD amount.');
          return false;
        }
        return true;
      },
    },
    {
      name: 'quantity',
      type: 'input',
      message: 'Initial Quantity?',
      validate(input) {
        // Test for a positive integer
        if (!/^[1-9]+[0-9]*$/gi.test(input)) {
          console.log('\nPlease enter a valid whole number.');
          return false;
        }
        return true;
      },
    },
  ]).then((answers) => {
    addProduct(answers);
  }).catch((err) => {
    return closeApp(`Error received: ${err}`);
  });
};

const addProduct = (input) => {
  // get dept id from dept name
  const deptID = depts.filter((dept) => {
    if (dept.dept_name === input.department) {
      return dept;
    }
  });

  // query was written this way to prevent auto_increment PK
  // from increasing after failed insert
  const query = [
    'INSERT INTO products (product_name, department_id, price, quantity)',
    'SELECT ?, ?, ?, ? WHERE NOT EXISTS ( SELECT * FROM products',
    'WHERE product_name=?);',
  ].join(' ');
  const data = [
    input.product.trim(),
    deptID[0].dept_id,
    parseFloat(input.price),
    Number(input.quantity),
    input.product.trim(),
  ];

  const syntax = connection.query(query, data, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err.code}`);
    }

    if (resp.affectedRows === 0) {
      console.log(
        'Product not added to database.',
        'Most likely due to a unique key violation caused by a '
                + 'duplicate product name.',
      );

      // provides slight delay in execution so user can see response
      return setTimeout(getMaxID, 5000);
    }
    console.log('Product Added!');

    // provides slight delay in execution so user can see response
    setTimeout(getMaxID, 5000);
  });
};

const closeApp = (msg) => {
  // log message, end db connection and close app
  console.log(msg);
  connection.end();
  process.exit();
};
