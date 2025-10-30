const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkBills() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('🔍 Checking all bills in database...');
    const [bills] = await db.execute('SELECT * FROM bills ORDER BY created_at DESC');
    console.log(`Total bills: ${bills.length}`);
    
    bills.forEach(bill => {
      console.log(`- ${bill.provider_name}: ₹${bill.amount} - ${bill.status} (User: ${bill.user_id})`);
    });
    
    // Check wallet balances  
    console.log('\n💰 Checking wallet balances...');
    const [wallets] = await db.execute('SELECT u.email, w.wallet_balance FROM users u JOIN wallets w ON u.user_id = w.user_id');
    wallets.forEach(wallet => {
      console.log(`- ${wallet.email}: ₹${wallet.wallet_balance}`);
    });
    
    // Calculate statistics for user 5 (qaz@gmail.com)
    console.log('\n📊 Calculating statistics for user 5...');
    const userId = 5;
    
    const [userBills] = await db.execute('SELECT * FROM bills WHERE user_id = ?', [userId]);
    const totalBills = userBills.length;
    const pendingBills = userBills.filter(bill => bill.status === 'Pending').length;
    const paidBills = userBills.filter(bill => bill.status === 'Paid').length;
    const pendingAmount = userBills.filter(bill => bill.status === 'Pending').reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
    const paidAmount = userBills.filter(bill => bill.status === 'Paid').reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
    
    console.log(`Total bills: ${totalBills}`);
    console.log(`Pending bills: ${pendingBills}`);
    console.log(`Paid bills: ${paidBills}`);
    console.log(`Pending amount: ₹${pendingAmount}`);
    console.log(`Paid amount: ₹${paidAmount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

checkBills();