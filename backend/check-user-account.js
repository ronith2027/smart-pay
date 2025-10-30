const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkUser() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('🔍 Checking qaz@gmail.com user details...');
    
    const [users] = await db.execute('SELECT user_id, email FROM users WHERE email = ?', ['qaz@gmail.com']);
    if (users.length === 0) {
      console.log('User not found');
      return;
    }
    
    const userId = users[0].user_id;
    console.log(`User ID: ${userId}`);
    
    const [accounts] = await db.execute('SELECT * FROM accounts WHERE user_id = ?', [userId]);
    console.log(`User accounts: ${accounts.length}`);
    accounts.forEach(acc => {
      console.log(`  - ${acc.bank_name}: ₹${acc.balance} (ID: ${acc.account_id})`);
    });
    
    // Also check if there are any bills for this user
    const [bills] = await db.execute('SELECT * FROM bills WHERE user_id = ?', [userId]);
    console.log(`User bills: ${bills.length}`);
    bills.forEach(bill => {
      console.log(`  - ${bill.provider_name}: ₹${bill.amount} - ${bill.status}`);
    });
    
    // Check recent transactions
    const [transactions] = await db.execute('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId]);
    console.log(`Recent transactions: ${transactions.length}`);
    transactions.forEach(txn => {
      console.log(`  - ${txn.transaction_type}: ₹${txn.amount} - ${txn.status} (${txn.payment_method})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

checkUser();