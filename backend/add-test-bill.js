const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function addTestBill() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('Adding a small test bill...');
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [result] = await db.execute(`
      INSERT INTO bills (user_id, provider_name, bill_type, amount, due_date) 
      VALUES (5, 'Test Utility', 'Electricity', 50.00, ?)
    `, [dueDate]);
    
    console.log(`✅ Test bill added with ID: ${result.insertId}`);
    console.log(`Due date: ${dueDate}`);
    
    // Verify current wallet balance
    const [wallet] = await db.execute('SELECT wallet_balance FROM wallets WHERE user_id = 5');
    console.log(`Current wallet balance: ₹${wallet[0].wallet_balance}`);
    
    // Show all bills for user 5
    const [bills] = await db.execute('SELECT * FROM bills WHERE user_id = 5');
    console.log(`\nAll bills for user 5:`);
    bills.forEach(bill => {
      console.log(`- ${bill.provider_name}: ₹${bill.amount} - ${bill.status}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

addTestBill();