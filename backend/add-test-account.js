const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function addTestAccount() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('🔧 Adding test account for qaz@gmail.com...');
    
    const [users] = await db.execute('SELECT user_id, email FROM users WHERE email = ?', ['qaz@gmail.com']);
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const userId = users[0].user_id;
    console.log(`User ID: ${userId}`);
    
    // Add a test account
    const [result] = await db.execute(`
      INSERT INTO accounts (user_id, account_number, bank_name, bank_type, ifsc_code, balance, is_primary) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, '123456789012', 'Test Bank', 'Savings', 'TEST0001234', 5000.00, true]);
    
    console.log(`✅ Test account added with ID: ${result.insertId}`);
    
    // Verify the account was added
    const [accounts] = await db.execute('SELECT * FROM accounts WHERE user_id = ?', [userId]);
    console.log(`User now has ${accounts.length} account(s):`);
    accounts.forEach(acc => {
      console.log(`  - ${acc.bank_name} (${acc.bank_type}): ₹${acc.balance} - ${acc.is_primary ? 'Primary' : 'Secondary'}`);
    });
    
  } catch (error) {
    if (error.message.includes('Duplicate entry')) {
      console.log('ℹ️  Account already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await db.end();
  }
}

addTestAccount();