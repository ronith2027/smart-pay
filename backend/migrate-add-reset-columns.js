const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'payment_history_db',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL database');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [process.env.DB_NAME || 'payment_history_db']);

    const columnNames = columns.map(col => col.COLUMN_NAME);
    
    // Add reset_token column if it doesn't exist
    if (!columnNames.includes('reset_token')) {
      console.log('Adding reset_token column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN reset_token VARCHAR(100) NULL
      `);
      console.log('✓ reset_token column added');
    } else {
      console.log('✓ reset_token column already exists');
    }

    // Add reset_expires_at column if it doesn't exist
    if (!columnNames.includes('reset_expires_at')) {
      console.log('Adding reset_expires_at column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN reset_expires_at DATETIME NULL
      `);
      console.log('✓ reset_expires_at column added');
    } else {
      console.log('✓ reset_expires_at column already exists');
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();