const db = require('../config/db');

// Get user's bank accounts with aggregate data (adapted for existing schema)
exports.getAccounts = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user account data from existing schema
    const [userResult] = await db.query(
      'SELECT user_id, account_balance, full_name FROM users WHERE user_id = ?',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult[0];
    
    // Mock account data based on existing schema
    const mockAccounts = [{
      account_id: 1,
      account_number: 'ACC' + userId.toString().padStart(10, '0'),
      bank_name: 'Primary Bank',
      bank_type: 'Savings',
      ifsc_code: 'BANK0001234',
      balance: user.account_balance,
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      masked_account_number: '******' + userId.toString().padStart(4, '0')
    }];

    // Generate mock statistics
    const accountStats = {
      total_accounts: 1,
      savings_accounts: 1,
      current_accounts: 0,
      credit_accounts: 0,
      total_balance: parseFloat(user.account_balance),
      average_balance: parseFloat(user.account_balance),
      highest_balance: parseFloat(user.account_balance),
      lowest_balance: parseFloat(user.account_balance)
    };

    const bankDistribution = [{
      bank_name: 'Primary Bank',
      account_count: 1,
      total_balance: parseFloat(user.account_balance),
      account_types: ['Savings']
    }];

    res.status(200).json({
      accounts: mockAccounts.map(account => ({
        ...account,
        balance: parseFloat(account.balance)
      })),
      statistics: accountStats,
      bank_distribution: bankDistribution
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      message: 'Error fetching accounts', 
      error: error.message 
    });
  }
};

// Add a new bank account
exports.addAccount = async (req, res) => {
  const userId = req.user.id;
  const { account_number, bank_name, bank_type, ifsc_code, balance = 0, is_primary = false } = req.body;

  if (!account_number || !bank_name || !bank_type || !ifsc_code) {
    return res.status(400).json({ 
      message: 'Account number, bank name, bank type, and IFSC code are required' 
    });
  }

  if (!['Savings', 'Current', 'Credit'].includes(bank_type)) {
    return res.status(400).json({ message: 'Invalid bank type' });
  }

  // Validate IFSC code format (basic validation)
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) {
    return res.status(400).json({ message: 'Invalid IFSC code format' });
  }

  if (balance < 0) {
    return res.status(400).json({ message: 'Balance cannot be negative' });
  }

  try {
    // Check if account number already exists
    const [existingAccounts] = await db.query(
      'SELECT account_id FROM accounts WHERE account_number = ?',
      [account_number]
    );

    if (existingAccounts.length > 0) {
      return res.status(400).json({ message: 'Account number already exists' });
    }

    // If this is set as primary, remove primary status from other accounts
    if (is_primary) {
      await db.query(
        'UPDATE accounts SET is_primary = FALSE WHERE user_id = ?',
        [userId]
      );
    }

    // Insert new account
    const [result] = await db.query(
      `INSERT INTO accounts (user_id, account_number, bank_name, bank_type, ifsc_code, balance, is_primary) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, account_number, bank_name, bank_type, ifsc_code, balance, is_primary]
    );

    res.status(201).json({
      message: 'Bank account added successfully!',
      account_id: result.insertId,
      account: {
        account_id: result.insertId,
        account_number,
        bank_name,
        bank_type,
        ifsc_code,
        balance: parseFloat(balance),
        is_primary,
        masked_account_number: '*'.repeat(account_number.length - 4) + account_number.slice(-4)
      }
    });

  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ 
      message: 'Error adding bank account', 
      error: error.message 
    });
  }
};

// Update account details
exports.updateAccount = async (req, res) => {
  const userId = req.user.id;
  const { account_id } = req.params;
  const { bank_name, balance, is_primary } = req.body;

  try {
    // Check if account exists and belongs to user
    const [accounts] = await db.query(
      'SELECT * FROM accounts WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const updateFields = [];
    const updateValues = [];

    if (bank_name) {
      updateFields.push('bank_name = ?');
      updateValues.push(bank_name);
    }

    if (balance !== undefined && balance >= 0) {
      updateFields.push('balance = ?');
      updateValues.push(balance);
    }

    if (is_primary !== undefined) {
      // If setting as primary, remove primary status from other accounts
      if (is_primary) {
        await db.query(
          'UPDATE accounts SET is_primary = FALSE WHERE user_id = ? AND account_id != ?',
          [userId, account_id]
        );
      }
      updateFields.push('is_primary = ?');
      updateValues.push(is_primary);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateValues.push(account_id, userId);

    await db.query(
      `UPDATE accounts SET ${updateFields.join(', ')} WHERE account_id = ? AND user_id = ?`,
      updateValues
    );

    // Get updated account
    const [updatedAccount] = await db.query(
      'SELECT * FROM accounts WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    res.status(200).json({
      message: 'Account updated successfully!',
      account: {
        ...updatedAccount[0],
        balance: parseFloat(updatedAccount[0].balance),
        masked_account_number: '*'.repeat(updatedAccount[0].account_number.length - 4) + updatedAccount[0].account_number.slice(-4)
      }
    });

  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ 
      message: 'Error updating account', 
      error: error.message 
    });
  }
};

// Delete an account
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const { account_id } = req.params;

  try {
    // Check if account exists and belongs to user
    const [accounts] = await db.query(
      'SELECT * FROM accounts WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check if account has balance
    if (accounts[0].balance > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete account with positive balance. Please transfer funds first.' 
      });
    }

    // Don't allow deletion of primary account if there are other accounts
    if (accounts[0].is_primary) {
      const [otherAccounts] = await db.query(
        'SELECT COUNT(*) as count FROM accounts WHERE user_id = ? AND account_id != ?',
        [userId, account_id]
      );

      if (otherAccounts[0].count > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete primary account. Please set another account as primary first.' 
        });
      }
    }

    await db.query(
      'DELETE FROM accounts WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    res.status(200).json({
      message: 'Account deleted successfully!',
      account_id: parseInt(account_id)
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      message: 'Error deleting account', 
      error: error.message 
    });
  }
};

// Set primary account
exports.setPrimaryAccount = async (req, res) => {
  const userId = req.user.id;
  const { account_id } = req.params;

  try {
    // Check if account exists and belongs to user
    const [accounts] = await db.query(
      'SELECT account_id FROM accounts WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Remove primary status from all accounts
    await db.query(
      'UPDATE accounts SET is_primary = FALSE WHERE user_id = ?',
      [userId]
    );

    // Set the specified account as primary
    await db.query(
      'UPDATE accounts SET is_primary = TRUE WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    res.status(200).json({
      message: 'Primary account updated successfully!',
      primary_account_id: parseInt(account_id)
    });

  } catch (error) {
    console.error('Set primary account error:', error);
    res.status(500).json({ 
      message: 'Error setting primary account', 
      error: error.message 
    });
  }
};

// Get account transactions
exports.getAccountTransactions = async (req, res) => {
  const userId = req.user.id;
  const { account_id } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    // Verify account belongs to user
    const [accounts] = await db.query(
      'SELECT account_number FROM accounts WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const accountNumber = accounts[0].account_number;

    // Get transactions related to this account
    const [transactions] = await db.query(
      `SELECT 
        transaction_id,
        transaction_type,
        amount,
        payment_method,
        status,
        description,
        reference_number,
        transaction_date
       FROM transactions 
       WHERE user_id = ? 
         AND (from_account = ? OR to_account = ? OR payment_method = 'Bank Transfer')
       ORDER BY transaction_date DESC
       LIMIT ? OFFSET ?`,
      [userId, accountNumber, accountNumber, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM transactions 
       WHERE user_id = ? AND (from_account = ? OR to_account = ? OR payment_method = 'Bank Transfer')`,
      [userId, accountNumber, accountNumber]
    );

    // Get transaction summary
    const [transactionSummary] = await db.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type IN ('Deposit', 'Transfer') AND to_account = ? THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN transaction_type IN ('Withdrawal', 'Transfer') AND from_account = ? THEN amount ELSE 0 END), 0) as total_debits
       FROM transactions 
       WHERE user_id = ? AND (from_account = ? OR to_account = ?)`,
      [accountNumber, accountNumber, userId, accountNumber, accountNumber]
    );

    res.status(200).json({
      account_id: parseInt(account_id),
      transactions: transactions.map(txn => ({
        ...txn,
        amount: parseFloat(txn.amount)
      })),
      transaction_summary: {
        total_transactions: transactionSummary[0].total_transactions,
        total_credits: parseFloat(transactionSummary[0].total_credits),
        total_debits: parseFloat(transactionSummary[0].total_debits),
        net_flow: parseFloat(transactionSummary[0].total_credits - transactionSummary[0].total_debits)
      },
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + parseInt(limit)) < countResult[0].total
      }
    });

  } catch (error) {
    console.error('Get account transactions error:', error);
    res.status(500).json({ 
      message: 'Error fetching account transactions', 
      error: error.message 
    });
  }
};

// Add money to a specific account
exports.addMoneyToAccount = async (req, res) => {
  const userId = req.user.id;
  const { account_id, amount, source, note } = req.body;

  if (!account_id || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Account ID and valid amount are required' });
  }

  if (!source || !['wallet', 'external'].includes(source)) {
    return res.status(400).json({ message: 'Source must be either "wallet" or "external"' });
  }

  try {
    // Verify account belongs to user
    const [accountCheck] = await db.query(
      'SELECT account_id, bank_name, balance FROM accounts WHERE account_id = ? AND user_id = ?',
      [account_id, userId]
    );

    if (accountCheck.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accountCheck[0];

    if (source === 'wallet') {
      // Check wallet balance
      const [userResult] = await db.query(
        'SELECT wallet_balance FROM users WHERE user_id = ?',
        [userId]
      );

      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const walletBalance = parseFloat(userResult[0].wallet_balance || 0);
      
      if (walletBalance < amount) {
        return res.status(400).json({ 
          message: `Insufficient wallet balance. Available: ₹${walletBalance}` 
        });
      }

      // Deduct from wallet
      await db.query(
        'UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
        [amount, userId]
      );
      
      // Update wallet table as well if it exists
      try {
        await db.query(
          'UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
          [amount, userId]
        );
      } catch (err) {
        console.log('Wallets table not found, skipping wallet table update');
      }
    }

    // Add to account
    await db.query(
      'UPDATE accounts SET balance = balance + ? WHERE account_id = ? AND user_id = ?',
      [amount, account_id, userId]
    );

    // Update user's account_balance (sum of all accounts)
    const [totalBalance] = await db.query(
      'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ?',
      [userId]
    );

    await db.query(
      'UPDATE users SET account_balance = ? WHERE user_id = ?',
      [totalBalance[0].total, userId]
    );

    // Get updated balances
    const [updatedUser] = await db.query(
      'SELECT wallet_balance, account_balance FROM users WHERE user_id = ?',
      [userId]
    );

    const [updatedAccount] = await db.query(
      'SELECT balance FROM accounts WHERE account_id = ?',
      [account_id]
    );

    res.status(200).json({
      message: `₹${amount} added to ${account.bank_name} account successfully!`,
      transaction: {
        type: source === 'wallet' ? 'Wallet to Account Transfer' : 'External Deposit',
        amount: parseFloat(amount),
        account_name: account.bank_name,
        note: note || '',
        timestamp: new Date().toISOString()
      },
      updated_balances: {
        wallet_balance: parseFloat(updatedUser[0].wallet_balance || 0),
        account_balance: parseFloat(updatedUser[0].account_balance || 0),
        account_new_balance: parseFloat(updatedAccount[0].balance)
      }
    });

  } catch (error) {
    console.error('Add money to account error:', error);
    res.status(500).json({ 
      message: 'Error adding money to account', 
      error: error.message 
    });
  }
};
