const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function testWalletPayment() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    const userId = 5;
    const billId = 4; // The test bill we just created
    
    console.log('🧪 Testing wallet payment logic...\n');
    
    // Step 1: Get bill details
    console.log('1. Checking bill details...');
    const [bills] = await db.execute(
      'SELECT * FROM bills WHERE bill_id = ? AND user_id = ? AND status = "Pending"',
      [billId, userId]
    );
    
    if (bills.length === 0) {
      console.log('❌ Bill not found or already paid');
      return;
    }
    
    const bill = bills[0];
    console.log(`✅ Found bill: ${bill.provider_name} - ₹${bill.amount}`);
    
    // Step 2: Check wallet balance
    console.log('\n2. Checking wallet balance...');
    const [walletResult] = await db.execute(
      'SELECT wallet_balance FROM wallets WHERE user_id = ?',
      [userId]
    );
    
    console.log(`Wallet query result:`, walletResult);
    
    if (!walletResult.length) {
      console.log('❌ No wallet found for user');
      return;
    }
    
    const walletBalance = parseFloat(walletResult[0].wallet_balance);
    const billAmount = parseFloat(bill.amount);
    
    console.log(`Wallet balance: ₹${walletBalance}`);
    console.log(`Bill amount: ₹${billAmount}`);
    console.log(`Sufficient funds: ${walletBalance >= billAmount ? '✅ Yes' : '❌ No'}`);
    
    if (walletBalance < billAmount) {
      console.log('❌ Insufficient wallet balance - this is the problem!');
      
      // Let's check the exact values and data types
      console.log('\\nDebugging data types:');
      console.log(`Wallet balance type: ${typeof walletBalance}, value: ${walletBalance}`);
      console.log(`Bill amount type: ${typeof billAmount}, value: ${billAmount}`);
      console.log(`Raw wallet balance: ${walletResult[0].wallet_balance}`);
      console.log(`Raw bill amount: ${bill.amount}`);
      
      return;
    }
    
    console.log('✅ Payment should succeed - wallet has sufficient funds');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

testWalletPayment();