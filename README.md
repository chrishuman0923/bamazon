# Bamazon

Bamazon is a CLI (Command Line Interface) app that uses several node modules and a MySQL back-end database to receive commands and create, read, and update records in the database. A preview video for how the application works is [here](https://drive.google.com/file/d/1UV0fseCcslC5RwYhS_VK6ruh-Mubp0df/view?usp=sharing).

## Notes
The application is divided into three javascript files that interact with different parts of the data in the database (customer, manager, and supervisor). The database consists of two tables, one for keeping track of the products and one for keeping track of the departments.

## Getting Started

1. `npm install`
2. Run schema file to create database
3. Seed database with starter data
4. `npm run customer` | `npm run manager` | `npm run supervisor`

## Technologies Used
- JavaScript
- Node
- NPM
- MySQL
- Inquirer
- Clear
- Console.table
