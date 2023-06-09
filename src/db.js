import mysql from "mysql2/promise";

// Create MySQL connection pool
const db = mysql.createPool({
  host: "127.0.0.1", // instead of "localhost"
  user: "root",
  password: "Iloveaugwood$4",
  database: "test_cases_db",
  port: 3306,
});

export default db;
