// config/db.js
const mysql = require("mysql");

const pool = mysql.createPool({
  host: "26.196.180.244",
  user: "aris",
  password: "aksa0502",
  database: "sik"
});

// AIzaSyDAw_S0MPp1w2XPJnkAvdYJqUQVyNJ7YXg
module.exports = pool;
