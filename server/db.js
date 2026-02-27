const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "School_monitoring",
  password: "rm123",
  port: 5432,
});

module.exports = pool;