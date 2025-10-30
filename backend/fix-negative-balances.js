/**
 * Script to fix negative wallet balances in the database
 * 
 * This script:
 * 1. Identifies users with negative wallet balances
 * 2. Sets those balances to 0 in both users and wallets tables
 * 3. Logs the changes for audit purposes
 */

const db = require('./src/config/db');

async function fixNegativeBalances() {
  console.log('Starting to fix negative wallet balances...');
  
  try {
    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Find users with negative wallet balances
      const [usersWithNegativeBalances] = await connection.query(
        'SELECT user_id, wallet_balance FROM users WHERE wallet_balance < 0'
      );
      
      console.log(`Found ${usersWithNegativeBalances.length} users with negative wallet balances`);
      
      // Fix each user's balance
      for (const user of usersWithNegativeBalances) {
        console.log(`Fixing user ID ${user.user_id} with balance ${user.wallet_balance}`);
        
        // Update users table
        await connection.query(
          'UPDATE users SET wallet_balance = 0 WHERE user_id = ? AND wallet_balance < 0',
          [user.user_id]
        );
        
        // Update wallets table
        await connection.query(
          'UPDATE wallets SET wallet_balance = 0 WHERE user_id = ? AND wallet_balance < 0',
          [user.user_id]
        );
        
        // Try to log the change in transaction_history
        try {
          await connection.query(
            `INSERT INTO transaction_history 
             (transaction_id, user_id, action_type, old_status, new_status, old_amount, new_amount, derived_from_transactions, notes)
             VALUES (0, ?, 'Updated', 'Error', 'Fixed', ?, 0, 'Negative balance correction', 'Automated fix for negative wallet balance')`,
            [user.user_id, user.wallet_balance]
          );
        } catch (logError) {
          console.warn('Could not log to transaction_history, continuing anyway:', logError.message);
        }
      }
      
      // Also fix any wallets that might be negative but not linked to users with negative balances
      const [walletRows] = await connection.query(
        'UPDATE wallets SET wallet_balance = 0 WHERE wallet_balance < 0'
      );
      
      if (walletRows.affectedRows > usersWithNegativeBalances.length) {
        console.log(`Fixed ${walletRows.affectedRows - usersWithNegativeBalances.length} additional wallets with negative balances`);
      }
      
      // Commit the transaction
      await connection.commit();
      console.log('Successfully fixed all negative wallet balances');
      
    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      console.error('Error fixing negative balances:', error);
      throw error;
    } finally {
      // Release the connection
      connection.release();
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Run the function
fixNegativeBalances()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });