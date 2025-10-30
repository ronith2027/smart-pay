const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function compareBalances() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('Comparing balance sources for user 5 (qaz@gmail.com)...\n');
    
    // Check users table structure first
    console.log('Checking users table structure...');
    const [userStructure] = await db.execute('DESCRIBE users');
    const hasWalletBalance = userStructure.some(col => col.Field === 'wallet_balance');
    const hasAccountBalance = userStructure.some(col => col.Field === 'account_balance');
    
    console.log(`Users table has wallet_balance: ${hasWalletBalance}`);
    console.log(`Users table has account_balance: ${hasAccountBalance}`);
    
    if (hasWalletBalance) {
      // Check users table
      const [users] = await db.execute('SELECT email, wallet_balance, account_balance FROM users WHERE user_id = 5');
      if (users.length > 0) {
        console.log('\nFrom users table:');
        console.log(`  wallet_balance: ${users[0].wallet_balance}`);
        console.log(`  account_balance: ${users[0].account_balance || 'NULL'}`);
      }
    }
    
    // Check wallets table
    const [wallets] = await db.execute('SELECT wallet_balance FROM wallets WHERE user_id = 5');
    if (wallets.length > 0) {
      console.log('\nFrom wallets table:');
      console.log(`  wallet_balance: ${wallets[0].wallet_balance}`);
    } else {
      console.log('\nWallets table: No wallet found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

compareBalances();