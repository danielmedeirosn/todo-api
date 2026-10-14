const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'todo',
  password: process.env.DB_PASSWORD || 'todo',
  database: process.env.DB_NAME || 'todo',
  waitForConnections: true,
  connectionLimit: 10,
});

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = { pool, migrate };
