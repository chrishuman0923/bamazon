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

const closeApp = (msg) => {
  // log message, end db connection and close app
  console.log(msg);
  connection.end();
  process.exit();
};

const getMaxID = () => {
  const query = 'SELECT MAX(item_id) AS maxID FROM products LIMIT 1;';

  // query db
  const syntax = connection.query(query, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    // set client-side variable of the max id in the database
    maxID = resp.maxID;

    // clear terminal and begin application
    clear();
    showAllProducts();
  });
};

// Connect to DB
connection.connect((err) => {
  if (err) {
    // error received, end connection and throw
    closeApp(`Error connecting to DB: ${err}`);
  }

  // connection successful
  getMaxID();
});

const showAllProducts = () => {
  const query = 'SELECT item_id, product_name, price, quantity FROM products ORDER BY item_id;';

  // query db
  const syntax = connection.query(query, (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
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

    // get user input on which item they want to buy
    itemToBuyInput();
  });
};

const itemToBuyInput = () => {
  // get user input
  inquirer.prompt([
    {
      name: 'id',
      type: 'input',
      message: 'Which item would you like to purchase (Enter ID or \'q\' to exit)?',
      validate(input) {
        // validation to determine if the id exists
        if (input.trim().toLowerCase() === 'q') {
          clear();
          return closeApp('Goodbye!');
        }

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
      message: 'Enter the quantity you would like to purchase?',
      validate(input) {
        if (!/^[1-9]+[0-9]*$/gi.test(input)) {
          console.log('\nPlease enter a valid whole number.');
          return false;
        }
        return true;
      },
    },
  ]).then((answers) => {
    checkInventory(answers);
  }).catch((err) => {
    closeApp(`Error received: ${err}`);
  });
};

const checkInventory = (input) => {
  const query = 'SELECT quantity FROM products WHERE item_id=? LIMIT 1;';
  const id = Number(input.id);
  const quantity = Number(input.quantity);

  // query db
  const syntax = connection.query(query, [id], (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    // is there enough inventory for what was requested
    if (quantity > resp[0].quantity) {
      // no...restart application so user can decide again
      console.log('\nInsufficient quantity in stock!');

      // provides slight delay in execution so user can see response
      setTimeout(getMaxID, 5000);
    } else {
      purchaseItem(id, quantity);
    }
  });
};

const purchaseItem = (id, quantity) => {
  const query = 'UPDATE products SET quantity=quantity-? WHERE item_id=?;';

  const syntax = connection.query(query, [quantity, id], (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }
  });

  showTotalCost(id, quantity);
};

const showTotalCost = (id, quantity) => {
  const query = 'SELECT price FROM products WHERE item_id=? LIMIT 1;';
  let totalCost = 0;

  const syntax = connection.query(query, [id], (err, resp) => {
    if (err) {
      return closeApp(`Error from query ${syntax.sql} -> ${err}`);
    }

    // get total cost
    totalCost = resp[0].price * quantity;

    const innerQuery = 'UPDATE products SET product_sales=product_sales+? WHERE item_id=?';

    const innerSyntax = connection.query(innerQuery, [totalCost, id], (innerErr, resp) => {
      if (innerErr) {
        return closeApp(`Error from query ${innerSyntax.sql} -> ${innerErr}`);
      }

      // get total cost and format as USD
      totalCost = new Intl.NumberFormat('en-EN', {
        style: 'currency',
        currency: 'USD',
      }).format(totalCost);

      // display total cost message
      console.log(`\nYour total cost was ${totalCost}.`);

      // provides slight delay in execution so user can see response
      setTimeout(getMaxID, 5000);
    });
  });
};
