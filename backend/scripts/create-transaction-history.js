const db = require('../src/config/db');

async function createTransactionHistoryTable() {
  try {
    console.log('🔄 Creating transaction history table...');
    
    // Drop existing table
    console.log('⚡ Dropping existing transaction_history table if exists...');
    await db.query('DROP TABLE IF EXISTS transaction_history_detailed');
    await db.query('DROP TABLE IF EXISTS transaction_history');
    console.log('✅ Existing tables dropped');
    
    // Create the comprehensive transaction_history table
    console.log('⚡ Creating transaction_history table...');
    await db.query(`
      CREATE TABLE transaction_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        transaction_type ENUM(
            'WALLET_FUND',           -- Adding money to wallet from bank account
            'WALLET_TRANSFER',       -- Wallet to wallet transfer (send/receive)
            'BILL_PAYMENT_WALLET',   -- Paying bills from wallet
            'BILL_PAYMENT_BANK',     -- Paying bills from bank account
            'ACCOUNT_TRANSFER',      -- Bank account to bank account transfer
            'ACCOUNT_DEPOSIT',       -- Money added to bank account
            'ACCOUNT_WITHDRAWAL',    -- Money withdrawn from bank account
            'WALLET_TO_ACCOUNT',     -- Transfer from wallet to bank account
            'ACCOUNT_TO_WALLET'      -- Transfer from bank account to wallet
        ) NOT NULL,
        
        -- Transaction details
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED') DEFAULT 'SUCCESS',
        
        -- Source and destination details
        source_type ENUM('WALLET', 'BANK_ACCOUNT', 'EXTERNAL') NOT NULL,
        source_id INT NULL,  -- wallet_id or account_id or external reference
        source_name VARCHAR(255) NULL, -- descriptive name of source
        
        destination_type ENUM('WALLET', 'BANK_ACCOUNT', 'BILL', 'USER', 'EXTERNAL') NOT NULL,
        destination_id INT NULL, -- wallet_id, account_id, bill_id, user_id, etc.
        destination_name VARCHAR(255) NULL, -- descriptive name of destination
        
        -- Transaction metadata
        description TEXT NULL,
        reference_number VARCHAR(100) NULL, -- unique transaction reference
        category VARCHAR(50) DEFAULT 'GENERAL',
        tags JSON NULL, -- additional metadata as JSON
        
        -- Related entity references
        bill_id INT NULL, -- if related to bill payment
        transfer_id INT NULL, -- if related to user-to-user transfer
        
        -- Balance tracking (optional - for reconciliation)
        balance_before DECIMAL(15,2) NULL,
        balance_after DECIMAL(15,2) NULL,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- when the actual transaction occurred
        
        -- Indexes for better performance
        INDEX idx_user_id (user_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_status (status),
        INDEX idx_reference_number (reference_number),
        INDEX idx_bill_id (bill_id),
        INDEX idx_transfer_id (transfer_id)
        
        -- Foreign key constraints (commented out for now)
        -- FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        -- FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE SET NULL,
        -- FOREIGN KEY (transfer_id) REFERENCES transfers(transfer_id) ON DELETE SET NULL
      );
    `);
    console.log('✅ transaction_history table created successfully');
    
    // Create the detailed view
    console.log('⚡ Creating transaction_history_detailed view...');
    await db.query(`
      CREATE VIEW transaction_history_detailed AS
      SELECT 
          th.*,
          u.username as user_name,
          u.email as user_email,
          b.provider_name as bill_provider,
          b.bill_type as bill_type,
          CASE 
              WHEN th.destination_type = 'USER' THEN (
                  SELECT username FROM users WHERE user_id = th.destination_id
              )
              ELSE NULL
          END as destination_user_name,
          CASE 
              WHEN th.source_type = 'BANK_ACCOUNT' THEN (
                  SELECT CONCAT(bank_name, ' - ', account_number) 
                  FROM accounts 
                  WHERE account_id = th.source_id AND user_id = th.user_id
              )
              ELSE NULL
          END as source_account_details,
          CASE 
              WHEN th.destination_type = 'BANK_ACCOUNT' THEN (
                  SELECT CONCAT(bank_name, ' - ', account_number) 
                  FROM accounts 
                  WHERE account_id = th.destination_id AND user_id = th.user_id
              )
              ELSE NULL
          END as destination_account_details
      FROM transaction_history th
      LEFT JOIN users u ON th.user_id = u.user_id
      LEFT JOIN bills b ON th.bill_id = b.bill_id
    `);
    console.log('✅ transaction_history_detailed view created successfully');
    
    // Add some sample data
    console.log('⚡ Adding sample transaction data...');
    await db.query(`
      INSERT INTO transaction_history (
          user_id, transaction_type, amount, source_type, source_name, 
          destination_type, destination_name, description, category, reference_number
      ) VALUES 
      (6, 'WALLET_FUND', 1000.00, 'BANK_ACCOUNT', 'HDFC Bank - ****4567', 'WALLET', 'My Wallet', 'Added funds to wallet from bank account', 'WALLET_MANAGEMENT', 'TXN_001'),
      (6, 'BILL_PAYMENT_WALLET', 500.00, 'WALLET', 'My Wallet', 'BILL', 'Electricity Bill', 'Paid electricity bill from wallet', 'UTILITIES', 'TXN_002'),
      (6, 'WALLET_TRANSFER', 200.00, 'WALLET', 'My Wallet', 'USER', 'john_doe', 'Money transfer to friend', 'TRANSFER', 'TXN_003')
    `);
    console.log('✅ Sample data added successfully');
    
    // Show table structure
    console.log('\n📋 Transaction History Table Structure:');
    const [structure] = await db.query('DESCRIBE transaction_history');
    console.table(structure);
    
    console.log('🎉 Transaction history table setup completed!');
    
    // Test the table by querying recent transactions
    console.log('\n📊 Testing transaction history query...');
    const [testRows] = await db.query(`
      SELECT 
        id, user_id, transaction_type, amount, source_name, 
        destination_name, description, created_at
      FROM transaction_history 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('Recent transactions:');
    console.table(testRows);
    
  } catch (error) {
    console.error('❌ Error setting up transaction history:', error);
  } finally {
    // Close the database connection
    try {
      await db.end();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
    process.exit(0);
  }
}

// Run the script
createTransactionHistoryTable();