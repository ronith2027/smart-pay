const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function initializeWallets() {
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
    
    // Check if wallets table exists
    const [tables] = await connection.query("SHOW TABLES LIKE 'wallets'");
    if (tables.length === 0) {
      console.log('❌ Wallets table does not exist, creating it...');
      
      await connection.query(`
        CREATE TABLE wallets (
          wallet_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE NOT NULL,
          wallet_balance DECIMAL(12,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          INDEX idx_user_wallet (user_id)
        )
      `);
      
      console.log('✅ Wallets table created');
    }
    
    // Check users table structure first
    const [userColumns] = await connection.query("DESCRIBE users");
    console.log('📊 Users table columns:', userColumns.map(col => col.Field));
    
    // Find users without wallets (using available columns)
    const [usersWithoutWallets] = await connection.query(`
      SELECT u.user_id, u.email 
      FROM users u 
      LEFT JOIN wallets w ON u.user_id = w.user_id 
      WHERE w.user_id IS NULL
    `);
    
    if (usersWithoutWallets.length > 0) {
      console.log(`📊 Found ${usersWithoutWallets.length} users without wallets`);
      
      // Create wallets for users who don't have them
      for (const user of usersWithoutWallets) {
        await connection.query(
          'INSERT INTO wallets (user_id, wallet_balance) VALUES (?, ?)',
          [user.user_id, 0.00]
        );
        console.log(`✅ Created wallet for user: ${user.email}`);
      }
    } else {
      console.log('✅ All users already have wallets');
    }
    
    // Update user balances from wallets table if they have wallet_balance column in users table
    const hasWalletBalanceColumn = userColumns.some(col => col.Field === 'wallet_balance');
    const hasAccountBalanceColumn = userColumns.some(col => col.Field === 'account_balance');
    
    if (hasWalletBalanceColumn) {
      console.log('📊 Syncing wallet balances with users table...');
      await connection.query(`
        UPDATE users u 
        JOIN wallets w ON u.user_id = w.user_id 
        SET u.wallet_balance = w.wallet_balance
      `);
      console.log('✅ Wallet balances synced');
    }
    
    if (hasAccountBalanceColumn) {
      console.log('📊 Syncing account balances with users table...');
      await connection.query(`
        UPDATE users u 
        LEFT JOIN (
          SELECT user_id, COALESCE(SUM(balance), 0) as total_balance 
          FROM accounts 
          GROUP BY user_id
        ) a ON u.user_id = a.user_id 
        SET u.account_balance = COALESCE(a.total_balance, 0)
      `);
      console.log('✅ Account balances synced');
    }
    
    // Show current status
    const [walletStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_wallets,
        SUM(wallet_balance) as total_wallet_balance,
        AVG(wallet_balance) as avg_wallet_balance
      FROM wallets
    `);
    
    console.log('📊 Wallet Statistics:', walletStats[0]);
    
  } catch (error) {
    console.error('❌ Error initializing wallets:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the initialization
initializeWallets();