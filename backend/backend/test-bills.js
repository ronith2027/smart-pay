require('dotenv').config({ path: './config.env' });
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payment_history_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function testBills() {
  const db = mysql.createPool(dbConfig);
  console.log('✅ Database connection pool created successfully');

  try {
    // Get a test user (qaz@gmail.com has ₹1000 wallet balance)
    const [users] = await db.query('SELECT user_id, email FROM users WHERE email = ?', ['qaz@gmail.com']);
    if (users.length === 0) {
      console.log('❌ Test user not found');
      return;
    }
    
    const testUser = users[0];
    console.log(`\n👤 Testing with user: ${testUser.email}`);

    // Check wallet balance before
    const [walletBefore] = await db.query('SELECT wallet_balance FROM wallets WHERE user_id = ?', [testUser.user_id]);
    console.log(`💰 Wallet balance before: ₹${walletBefore[0]?.wallet_balance || 0}`);

    // Insert a test bill
    const testBill = {
      user_id: testUser.user_id,
      provider_name: 'Test Electricity Board',
      bill_type: 'Electricity', 
      amount: 250.00,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
    };

    console.log('\n📋 Creating test bill...');
    const [billResult] = await db.query(
      'INSERT INTO bills (user_id, provider_name, bill_type, amount, due_date) VALUES (?, ?, ?, ?, ?)',
      [testBill.user_id, testBill.provider_name, testBill.bill_type, testBill.amount, testBill.due_date]
    );

    const billId = billResult.insertId;
    console.log(`✅ Bill created with ID: ${billId}`);

    // List user's bills
    const [bills] = await db.query('SELECT * FROM bills WHERE user_id = ?', [testUser.user_id]);
    console.log(`\n📄 User's bills (${bills.length}):`);
    bills.forEach(bill => {
      console.log(`  - ${bill.provider_name} (${bill.bill_type}): ₹${bill.amount} - ${bill.status}`);
    });

    // Check if user has sufficient wallet balance to pay the bill
    const currentBalance = parseFloat(walletBefore[0]?.wallet_balance || 0);
    if (currentBalance >= testBill.amount) {
      console.log('\n💳 Simulating bill payment...');
      
      // Generate transaction
      const referenceNumber = 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const [transactionResult] = await db.query(
        `INSERT INTO transactions (user_id, transaction_type, amount, payment_method, status, description, reference_number) 
         VALUES (?, 'Bill Payment', ?, 'Wallet', 'Success', ?, ?)`,
        [
          testUser.user_id,
          testBill.amount,
          `${testBill.bill_type} bill payment to ${testBill.provider_name}`,
          referenceNumber
        ]
      );

      // Update bill status
      await db.query(
        'UPDATE bills SET status = "Paid", transaction_id = ? WHERE bill_id = ?',
        [transactionResult.insertId, billId]
      );

      // Update wallet balance
      await db.query(
        'UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
        [testBill.amount, testUser.user_id]
      );

      console.log(`✅ Bill paid successfully! Reference: ${referenceNumber}`);

      // Check wallet balance after
      const [walletAfter] = await db.query('SELECT wallet_balance FROM wallets WHERE user_id = ?', [testUser.user_id]);
      console.log(`💰 Wallet balance after: ₹${walletAfter[0]?.wallet_balance || 0}`);

      // Verify bill status
      const [paidBill] = await db.query('SELECT * FROM bills WHERE bill_id = ?', [billId]);
      console.log(`📄 Bill status: ${paidBill[0]?.status}`);

    } else {
      console.log(`❌ Insufficient wallet balance (₹${currentBalance}) to pay bill (₹${testBill.amount})`);
    }

    // Show recent transactions
    const [transactions] = await db.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC LIMIT 3',
      [testUser.user_id]
    );
    console.log(`\n💸 Recent transactions (${transactions.length}):`);
    transactions.forEach(txn => {
      console.log(`  - ${txn.transaction_type}: ₹${txn.amount} - ${txn.status} (${txn.reference_number})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
    console.log('\n🔐 Database connection closed');
  }
}

testBills();