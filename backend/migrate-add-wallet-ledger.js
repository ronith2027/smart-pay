const mysql = require('mysql2/promise');

(async () => {
  console.log('🚀 Running migration: add wallet/account balances and wallet_ledger table');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'payment_history_db'
  });

  try {
    await connection.beginTransaction();

    // Add columns if not exist
    await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00");
    await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00");

    // Create wallet_ledger if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wallet_ledger (
        ledger_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        entry_type ENUM('add_wallet','add_account','account_to_wallet','wallet_to_account') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create user_accounts if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        account_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(32) NOT NULL,
        ifsc_code VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, account_number),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.commit();
    console.log('✅ Migration completed successfully');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Migration failed:', err.message);
  } finally {
    await connection.end();
  }
})();
