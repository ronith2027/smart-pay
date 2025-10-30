const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function addTransactionIdToBills() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('🔧 Adding transaction_id column to bills table...');
    await db.execute(`
      ALTER TABLE bills 
      ADD COLUMN transaction_id INT NULL
    `);
    console.log('✅ transaction_id column added to bills table');

    console.log('🔧 Adding foreign key constraint...');
    await db.execute(`
      ALTER TABLE bills 
      ADD FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL
    `);
    console.log('✅ Foreign key constraint added');

    console.log('\n🎉 Bills table updated successfully!');
    
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('ℹ️  transaction_id column already exists');
    } else if (error.message.includes('Duplicate key')) {
      console.log('ℹ️  Foreign key constraint already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await db.end();
  }
}

addTransactionIdToBills();