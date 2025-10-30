const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function addTestBalance() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'payment_history_db'
    });
    
    console.log('✅ Connected to database');
    
    // Add 1000 to user ID 3's wallet balance (testuser123@example.com)
    await connection.query(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
      [1000, 3]
    );
    
    // Also update wallets table
    await connection.query(
      'UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
      [1000, 3]
    );
    
    // Get updated balance
    const [userResult] = await connection.query(
      'SELECT wallet_balance, account_balance FROM users WHERE user_id = ?',
      [3]
    );
    
    console.log('✅ Added ₹1000 to user wallet');
    console.log('📊 Updated balances:', userResult[0]);
    
  } catch (error) {
    console.error('❌ Error adding balance:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the script
addTestBalance();