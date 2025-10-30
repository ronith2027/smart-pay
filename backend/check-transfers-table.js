const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkTransfersTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'payment_history_db'
    });
    
    console.log('✅ Connected to database');
    
    // Check if transfers table exists and describe its structure
    try {
      const [tables] = await connection.query("SHOW TABLES LIKE 'transfers'");
      if (tables.length > 0) {
        console.log('📊 Transfers table exists');
        const [columns] = await connection.query("DESCRIBE transfers");
        console.log('🏗️  Transfers table structure:');
        columns.forEach(col => {
          console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
        });
      } else {
        console.log('❌ Transfers table does not exist');
      }
    } catch (error) {
      console.log('❌ Error checking transfers table:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the script
checkTransfersTable();