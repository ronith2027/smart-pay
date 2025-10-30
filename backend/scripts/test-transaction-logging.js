const db = require('../src/config/db');
const { 
  logWalletFund,
  logBillPaymentWallet,
  logWalletTransfer 
} = require('../src/utils/transactionLogger');

async function testTransactionLogging() {
  try {
    console.log('🧪 Testing transaction logging functionality...');
    
    const userId = 6; // Assuming test user ID
    
    // Test 1: Log a wallet fund transaction
    console.log('\n📝 Test 1: Wallet Fund Transaction');
    const walletFundResult = await logWalletFund(
      userId,
      500.00,
      'HDFC Bank - ****1234',
      1000.00, // balance before
      1500.00, // balance after
      1 // account ID
    );
    console.log('✅ Wallet fund transaction logged:', walletFundResult.reference_number);
    
    // Test 2: Log a bill payment transaction
    console.log('\n📝 Test 2: Bill Payment Transaction');
    const billPaymentResult = await logBillPaymentWallet(
      userId,
      123.50,
      'Electricity Provider',
      1, // bill ID
      1500.00, // balance before
      1376.50  // balance after
    );
    console.log('✅ Bill payment transaction logged:', billPaymentResult.reference_number);
    
    // Test 3: Log a wallet transfer transaction
    console.log('\n📝 Test 3: Wallet Transfer Transaction');
    const walletTransferResult = await logWalletTransfer(
      userId,
      200.00,
      'John Doe',
      2, // recipient user ID
      null, // transfer ID
      1376.50, // balance before
      1176.50  // balance after
    );
    console.log('✅ Wallet transfer transaction logged:', walletTransferResult.reference_number);
    
    // Test 4: Fetch recent transactions
    console.log('\n📝 Test 4: Fetching Recent Transactions');
    const [recentTransactions] = await db.query(`
      SELECT 
        id, transaction_type, amount, source_name, destination_name, 
        description, status, reference_number, created_at
      FROM transaction_history 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [userId]);
    
    console.log(`✅ Found ${recentTransactions.length} recent transactions:`);
    recentTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.transaction_type} - ₹${txn.amount} - ${txn.reference_number}`);
      console.log(`      ${txn.description}`);
    });
    
    // Test 5: Get transaction statistics
    console.log('\n📝 Test 5: Transaction Statistics');
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_transactions
      FROM transaction_history 
      WHERE user_id = ?
    `, [userId]);
    
    console.log('✅ Transaction Statistics:');
    console.log(`   Total Transactions: ${stats[0].total_transactions}`);
    console.log(`   Total Amount: ₹${Number(stats[0].total_amount).toFixed(2)}`);
    console.log(`   Average Amount: ₹${Number(stats[0].avg_amount).toFixed(2)}`);
    console.log(`   Success Rate: ${((stats[0].successful_transactions / stats[0].total_transactions) * 100).toFixed(2)}%`);
    
    console.log('\n🎉 All transaction logging tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during transaction logging test:', error);
  } finally {
    try {
      await db.end();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
    process.exit(0);
  }
}

// Run the test
testTransactionLogging();