const db = require('../config/db');

/**
 * Log a transaction to the transaction_history table
 * @param {Object} transactionData - Transaction data to log
 * @param {number} transactionData.user_id - User ID
 * @param {string} transactionData.transaction_type - Type of transaction (ENUM)
 * @param {number} transactionData.amount - Transaction amount
 * @param {string} transactionData.source_type - Source type (WALLET, BANK_ACCOUNT, EXTERNAL)
 * @param {number} transactionData.source_id - Source ID (optional)
 * @param {string} transactionData.source_name - Source name
 * @param {string} transactionData.destination_type - Destination type
 * @param {number} transactionData.destination_id - Destination ID (optional)
 * @param {string} transactionData.destination_name - Destination name
 * @param {string} transactionData.description - Description
 * @param {string} transactionData.category - Category (optional)
 * @param {number} transactionData.bill_id - Bill ID for bill payments (optional)
 * @param {number} transactionData.transfer_id - Transfer ID for transfers (optional)
 * @param {number} transactionData.balance_before - Balance before transaction (optional)
 * @param {number} transactionData.balance_after - Balance after transaction (optional)
 * @param {string} transactionData.status - Transaction status (optional, defaults to SUCCESS)
 * @returns {Promise<Object>} - Created transaction record
 */
async function logTransaction(transactionData) {
  try {
    // Generate a unique reference number
    const referenceNumber = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const {
      user_id,
      transaction_type,
      amount,
      source_type,
      source_id = null,
      source_name,
      destination_type,
      destination_id = null,
      destination_name,
      description,
      category = 'GENERAL',
      bill_id = null,
      transfer_id = null,
      balance_before = null,
      balance_after = null,
      status = 'SUCCESS'
    } = transactionData;

    const insertQuery = `
      INSERT INTO transaction_history (
        user_id, transaction_type, amount, source_type, source_id, source_name,
        destination_type, destination_id, destination_name, description, category,
        reference_number, bill_id, transfer_id, balance_before, balance_after, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      user_id,
      transaction_type,
      amount,
      source_type,
      source_id,
      source_name,
      destination_type,
      destination_id,
      destination_name,
      description,
      category,
      referenceNumber,
      bill_id,
      transfer_id,
      balance_before,
      balance_after,
      status
    ];

    const [result] = await db.query(insertQuery, values);
    
    // Return the created transaction with ID
    const [createdTransaction] = await db.query(
      'SELECT * FROM transaction_history WHERE id = ?', 
      [result.insertId]
    );

    console.log(`💳 Transaction logged: ${transaction_type} - ${amount} INR - ${referenceNumber}`);
    
    return createdTransaction[0];
  } catch (error) {
    console.error('❌ Error logging transaction:', error);
    throw error;
  }
}

/**
 * Predefined transaction logging functions for common operations
 */

// Wallet operations
const logWalletFund = (userId, amount, sourceAccountName, balanceBefore, balanceAfter, accountId = null) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'WALLET_FUND',
    amount,
    source_type: 'BANK_ACCOUNT',
    source_id: accountId,
    source_name: sourceAccountName,
    destination_type: 'WALLET',
    destination_name: 'My Wallet',
    description: `Added ₹${amount} to wallet from ${sourceAccountName}`,
    category: 'WALLET_MANAGEMENT',
    balance_before: balanceBefore,
    balance_after: balanceAfter
  });
};

const logWalletTransfer = (userId, amount, recipientName, recipientId, transferId, balanceBefore, balanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'WALLET_TRANSFER',
    amount,
    source_type: 'WALLET',
    source_name: 'My Wallet',
    destination_type: 'USER',
    destination_id: recipientId,
    destination_name: recipientName,
    description: `Sent ₹${amount} to ${recipientName}`,
    category: 'TRANSFER',
    transfer_id: transferId,
    balance_before: balanceBefore,
    balance_after: balanceAfter
  });
};

const logWalletTransferReceived = (userId, amount, senderName, senderId, transferId, balanceBefore, balanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'WALLET_TRANSFER',
    amount,
    source_type: 'USER',
    source_id: senderId,
    source_name: senderName,
    destination_type: 'WALLET',
    destination_name: 'My Wallet',
    description: `Received ₹${amount} from ${senderName}`,
    category: 'TRANSFER',
    transfer_id: transferId,
    balance_before: balanceBefore,
    balance_after: balanceAfter
  });
};

// Bill payments
const logBillPaymentWallet = (userId, amount, billProvider, billId, balanceBefore, balanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'BILL_PAYMENT_WALLET',
    amount,
    source_type: 'WALLET',
    source_name: 'My Wallet',
    destination_type: 'BILL',
    destination_name: billProvider,
    description: `Paid ${billProvider} bill of ₹${amount} from wallet`,
    category: 'UTILITIES',
    bill_id: billId,
    balance_before: balanceBefore,
    balance_after: balanceAfter
  });
};

const logBillPaymentBank = (userId, amount, billProvider, accountName, billId, accountId, balanceBefore, balanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'BILL_PAYMENT_BANK',
    amount,
    source_type: 'BANK_ACCOUNT',
    source_id: accountId,
    source_name: accountName,
    destination_type: 'BILL',
    destination_name: billProvider,
    description: `Paid ${billProvider} bill of ₹${amount} from ${accountName}`,
    category: 'UTILITIES',
    bill_id: billId,
    balance_before: balanceBefore,
    balance_after: balanceAfter
  });
};

// Account operations
const logAccountDeposit = (userId, amount, accountName, accountId, balanceBefore, balanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'ACCOUNT_DEPOSIT',
    amount,
    source_type: 'EXTERNAL',
    source_name: 'External Deposit',
    destination_type: 'BANK_ACCOUNT',
    destination_id: accountId,
    destination_name: accountName,
    description: `Deposited ₹${amount} to ${accountName}`,
    category: 'ACCOUNT_MANAGEMENT',
    balance_before: balanceBefore,
    balance_after: balanceAfter
  });
};

const logAccountWithdrawal = (userId, amount, accountName, accountId, balanceBefore, balanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'ACCOUNT_WITHDRAWAL',
    amount,
    source_type: 'BANK_ACCOUNT',
    source_id: accountId,
    source_name: accountName,
    destination_type: 'EXTERNAL',
    destination_name: 'Cash Withdrawal',
    description: `Withdrew ₹${amount} from ${accountName}`,
    category: 'ACCOUNT_MANAGEMENT',
    balance_before: balanceBefore,
    balance_after: balanceAfter
  });
};

const logWalletToAccount = (userId, amount, accountName, accountId, walletBalanceBefore, walletBalanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'WALLET_TO_ACCOUNT',
    amount,
    source_type: 'WALLET',
    source_name: 'My Wallet',
    destination_type: 'BANK_ACCOUNT',
    destination_id: accountId,
    destination_name: accountName,
    description: `Transferred ₹${amount} from wallet to ${accountName}`,
    category: 'TRANSFER',
    balance_before: walletBalanceBefore,
    balance_after: walletBalanceAfter
  });
};

const logAccountToWallet = (userId, amount, accountName, accountId, accountBalanceBefore, accountBalanceAfter) => {
  return logTransaction({
    user_id: userId,
    transaction_type: 'ACCOUNT_TO_WALLET',
    amount,
    source_type: 'BANK_ACCOUNT',
    source_id: accountId,
    source_name: accountName,
    destination_type: 'WALLET',
    destination_name: 'My Wallet',
    description: `Transferred ₹${amount} from ${accountName} to wallet`,
    category: 'TRANSFER',
    balance_before: accountBalanceBefore,
    balance_after: accountBalanceAfter
  });
};

module.exports = {
  logTransaction,
  logWalletFund,
  logWalletTransfer,
  logWalletTransferReceived,
  logBillPaymentWallet,
  logBillPaymentBank,
  logAccountDeposit,
  logAccountWithdrawal,
  logWalletToAccount,
  logAccountToWallet
};