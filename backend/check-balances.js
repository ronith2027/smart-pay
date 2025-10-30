const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function checkBalances() {
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
    
    // Check user balances
    const [users] = await connection.query('SELECT user_id, email, full_name, wallet_balance, account_balance FROM users');
    console.log('📊 User balances:');
    users.forEach(user => {
      console.log(`  ${user.email}: Wallet: ₹${user.wallet_balance}, Account: ₹${user.account_balance}`);
    });
    
    // Check wallet balances
    console.log('\n💰 Wallet table balances:');
    try {
      const [wallets] = await connection.query('SELECT user_id, wallet_balance FROM wallets');
      wallets.forEach(wallet => {
        console.log(`  User ${wallet.user_id}: ₹${wallet.wallet_balance}`);
      });
    } catch (error) {
      console.log('  Wallets table not accessible');
    }
    
    // Check transfers
    console.log('\n💸 Recent transfers:');
    try {
      const [transfers] = await connection.query(`
        SELECT 
          t.transfer_id,
          t.from_user_id, 
          t.to_user_id, 
          t.amount, 
          t.note,
          t.created_at,
          sender.email as sender_email,
          recipient.email as recipient_email
        FROM transfers t 
        LEFT JOIN users sender ON t.from_user_id = sender.user_id
        LEFT JOIN users recipient ON t.to_user_id = recipient.user_id
        ORDER BY t.created_at DESC LIMIT 5
      `);
      
      if (transfers.length > 0) {
        transfers.forEach(transfer => {
          console.log(`  ${transfer.sender_email} → ${transfer.recipient_email}: ₹${transfer.amount} (${transfer.note})`);
        });
      } else {
        console.log('  No transfers found');
      }
    } catch (error) {
      console.log('  Transfers table not accessible');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the script
checkBalances();