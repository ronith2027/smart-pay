const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function createAccountsTable() {
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
    
    // Create accounts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account_number VARCHAR(20) UNIQUE NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        bank_type ENUM('Savings', 'Current', 'Credit') NOT NULL,
        ifsc_code VARCHAR(11) NOT NULL,
        balance DECIMAL(12,2) DEFAULT 0.00,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_user_accounts (user_id)
      )
    `);
    
    console.log('✅ Accounts table created successfully');
    
    // Add some sample accounts for testing
    const sampleAccounts = [
      {
        user_id: 3, // testuser123@example.com
        account_number: 'ACC000000001',
        bank_name: 'State Bank of India',
        bank_type: 'Savings',
        ifsc_code: 'SBIN0001234',
        balance: 5000.00,
        is_primary: true
      },
      {
        user_id: 3,
        account_number: 'ACC000000002', 
        bank_name: 'HDFC Bank',
        bank_type: 'Current',
        ifsc_code: 'HDFC0002345',
        balance: 2500.00,
        is_primary: false
      }
    ];
    
    for (const account of sampleAccounts) {
      try {
        await connection.query(`
          INSERT INTO accounts (user_id, account_number, bank_name, bank_type, ifsc_code, balance, is_primary) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          account.user_id,
          account.account_number,
          account.bank_name,
          account.bank_type,
          account.ifsc_code,
          account.balance,
          account.is_primary
        ]);
        console.log(`✅ Added ${account.bank_name} account for user ${account.user_id}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Account ${account.account_number} already exists`);
        } else {
          console.error(`❌ Error adding account: ${error.message}`);
        }
      }
    }
    
    // Update users table with total account balance
    await connection.query(`
      UPDATE users u 
      LEFT JOIN (
        SELECT user_id, COALESCE(SUM(balance), 0) as total_balance 
        FROM accounts 
        GROUP BY user_id
      ) a ON u.user_id = a.user_id 
      SET u.account_balance = COALESCE(a.total_balance, 0)
    `);
    
    console.log('✅ Updated users account_balance totals');
    
    // Show accounts summary
    const [accounts] = await connection.query(`
      SELECT a.*, u.email 
      FROM accounts a 
      JOIN users u ON a.user_id = u.user_id 
      ORDER BY a.user_id, a.is_primary DESC
    `);
    
    console.log('📊 Accounts Summary:');
    accounts.forEach(acc => {
      console.log(`  ${acc.email}: ${acc.bank_name} (${acc.bank_type}) - ₹${acc.balance} ${acc.is_primary ? '[PRIMARY]' : ''}`);
    });
    
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
createAccountsTable();