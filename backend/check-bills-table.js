const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkBillsTable() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('🔍 Checking bills table structure...');
    const [structure] = await db.execute('DESCRIBE bills');
    console.log('📋 Bills table columns:');
    structure.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

checkBillsTable();