const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function getCurrentState() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('📋 Current database state:');
    
    // Show all users with their IDs
    const [users] = await db.execute('SELECT user_id, email FROM users ORDER BY user_id');
    console.log('\n👤 All users:');
    users.forEach(user => {
      console.log(`  ID ${user.user_id}: ${user.email}`);
    });
    
    // Show all pending bills
    const [bills] = await db.execute('SELECT bill_id, user_id, provider_name, amount, status FROM bills WHERE status = "Pending" ORDER BY bill_id');
    console.log('\n📄 Pending bills:');
    bills.forEach(bill => {
      console.log(`  Bill ${bill.bill_id}: User ${bill.user_id} - ${bill.provider_name} ₹${bill.amount}`);
    });
    
    // Show all accounts with balances
    const [accounts] = await db.execute('SELECT account_id, user_id, bank_name, balance FROM accounts ORDER BY user_id, account_id');
    console.log('\n🏦 All accounts:');
    accounts.forEach(acc => {
      console.log(`  Account ${acc.account_id}: User ${acc.user_id} - ${acc.bank_name} ₹${acc.balance}`);
    });
    
    // Show wallet balances
    const [wallets] = await db.execute('SELECT user_id, wallet_balance FROM wallets ORDER BY user_id');
    console.log('\n💰 Wallet balances:');
    wallets.forEach(wallet => {
      console.log(`  User ${wallet.user_id}: ₹${wallet.wallet_balance}`);
    });
    
    // Show specific user 6 details (seems to be the one from screenshot)
    console.log('\n🔍 User 6 (rr@gmail.com) detailed info:');
    const [user6Accounts] = await db.execute('SELECT * FROM accounts WHERE user_id = 6');
    console.log('Accounts:', user6Accounts);
    
    const [user6Wallet] = await db.execute('SELECT * FROM wallets WHERE user_id = 6');
    console.log('Wallet:', user6Wallet);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

getCurrentState();