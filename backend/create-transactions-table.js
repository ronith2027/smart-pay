const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

async function createTransactionsTable() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payment_history_db'
  });
  
  try {
    console.log('🔧 Creating transactions table...');
    
    // Create transactions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        transaction_type ENUM('Payment', 'Transfer', 'Deposit', 'Withdrawal', 'Bill Payment', 'Refund') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_method ENUM('Wallet', 'Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cash') NOT NULL,
        status ENUM('Pending', 'Success', 'Failed', 'Cancelled') DEFAULT 'Pending',
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        reference_number VARCHAR(50) UNIQUE,
        from_account VARCHAR(50),
        to_account VARCHAR(50),
        service_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_user_transactions (user_id),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_status_trans (status),
        INDEX idx_reference (reference_number)
      )
    `);
    console.log('✅ Transactions table created successfully');

    // Create transaction_history table
    console.log('🔧 Creating transaction_history table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transaction_history (
        history_id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NOT NULL,
        user_id INT NOT NULL,
        action_type ENUM('Created', 'Updated', 'Cancelled', 'Refunded') NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        old_amount DECIMAL(12,2),
        new_amount DECIMAL(12,2),
        derived_from_transactions TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        changed_by INT,
        notes TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_transaction_history (transaction_id),
        INDEX idx_user_history (user_id)
      )
    `);
    console.log('✅ Transaction_history table created successfully');

    // Add foreign key to bills table
    console.log('🔧 Adding foreign key to bills table...');
    try {
      await db.execute(`
        ALTER TABLE bills 
        ADD FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL
      `);
      console.log('✅ Foreign key added to bills table');
    } catch (error) {
      if (error.message.includes('Duplicate key')) {
        console.log('ℹ️  Foreign key already exists in bills table');
      } else {
        console.log('⚠️  Could not add foreign key to bills table:', error.message);
      }
    }

    console.log('\n🎉 Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

createTransactionsTable();