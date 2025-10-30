const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkUserIds() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('📋 All users in database:');
    const [users] = await db.execute('SELECT user_id, email FROM users ORDER BY user_id');
    users.forEach(user => {
      console.log(`  User ID ${user.user_id}: ${user.email}`);
    });
    
    console.log('\n💰 Wallet balances:');
    const [wallets] = await db.execute('SELECT user_id, wallet_balance FROM wallets ORDER BY user_id');
    wallets.forEach(wallet => {
      console.log(`  User ID ${wallet.user_id}: ₹${wallet.wallet_balance}`);
    });
    
    console.log('\n📄 Pending bills:');
    const [bills] = await db.execute('SELECT bill_id, user_id, provider_name, amount, status FROM bills WHERE status = "Pending" ORDER BY bill_id');
    bills.forEach(bill => {
      console.log(`  Bill ID ${bill.bill_id}: User ${bill.user_id} - ${bill.provider_name} - ₹${bill.amount}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

checkUserIds();