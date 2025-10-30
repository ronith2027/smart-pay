const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkTables() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('🔍 Checking database tables...\n');
    const [tables] = await db.execute('SHOW TABLES');
    console.log('📋 Available tables:');
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });
    
    // Check specifically for transactions table
    console.log('\n🔍 Checking transactions table structure...');
    try {
      const [structure] = await db.execute('DESCRIBE transactions');
      console.log('✅ Transactions table exists with columns:');
      structure.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (transError) {
      console.log('❌ Transactions table does not exist:', transError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

checkTables();