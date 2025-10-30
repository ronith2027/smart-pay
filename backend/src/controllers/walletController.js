const db = require('../config/db');
const crypto = require('crypto');

// Generate unique transaction reference number
const generateReferenceNumber = () => {
  return 'TXN' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

// Create a new wallet
exports.createWallet = async (req, res) => {
  const userId = req.user.id;
  const { wallet_name, balance = 0, currency = 'USD' } = req.body;

  try {
    // Check if user already has a wallet
    const [existingWallet] = await db.query(
      'SELECT wallet_id FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (existingWallet.length > 0) {
      return res.status(400).json({ message: 'User already has a wallet' });
    }

    // Create new wallet with existing schema (no wallet_name or currency fields)
    const [result] = await db.query(
      'INSERT INTO wallets (user_id, wallet_balance) VALUES (?, ?)',
      [userId, balance]
    );

    // If initial balance > 0, create a transaction record
    if (balance > 0) {
      const referenceNumber = generateReferenceNumber();
      await db.query(
        'INSERT INTO transactions (user_id, transaction_type, amount, payment_method, status, description, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'Deposit', balance, 'Initial Balance', 'Success', 'Initial wallet setup', referenceNumber]
      );
    }

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet: {
        wallet_id: result.insertId,
        wallet_name: wallet_name || 'My Wallet',
        balance,
        currency: currency || 'USD'
      }
    });

  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ 
      message: 'Error creating wallet', 
      error: error.message 
    });
  }
};

// Get all wallets
exports.getWallets = async (req, res) => {
  const userId = req.user.id;

  try {
    const [wallets] = await db.query(
      'SELECT wallet_id, wallet_balance as balance, created_at FROM wallets WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      wallets: wallets.map(wallet => ({
        ...wallet,
        wallet_name: 'My Wallet', // Default name since schema doesn't have this field
        currency: 'USD', // Default currency since schema doesn't have this field
        balance: parseFloat(wallet.balance)
      }))
    });

  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ 
      message: 'Error fetching wallets', 
      error: error.message 
    });
  }
};

// Add money to wallet
exports.addMoney = async (req, res) => {
  const userId = req.user.id;
  const { wallet_id, amount } = req.body;

  if (!wallet_id || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Valid wallet ID and amount are required' });
  }

  try {
    // Verify wallet belongs to user
    const [wallet] = await db.query(
      'SELECT wallet_balance FROM wallets WHERE wallet_id = ? AND user_id = ?',
      [wallet_id, userId]
    );

    if (wallet.length === 0) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const referenceNumber = generateReferenceNumber();
    const oldBalance = parseFloat(wallet[0].wallet_balance);
    const newBalance = oldBalance + parseFloat(amount);
    
    // Create transaction record
    const [transactionResult] = await db.query(
      'INSERT INTO transactions (user_id, transaction_type, amount, payment_method, status, description, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, 'Deposit', amount, 'Wallet Top-up', 'Success', 'Add money to wallet', referenceNumber]
    );

    // Update wallet balance
    await db.query(
      'UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE wallet_id = ? AND user_id = ?',
      [amount, wallet_id, userId]
    );

    res.status(200).json({
      message: 'Money added successfully',
      transaction: {
        transaction_id: transactionResult.insertId,
        reference_number: referenceNumber,
        amount: parseFloat(amount),
        balance_before: oldBalance,
        balance_after: newBalance
      }
    });

  } catch (error) {
    console.error('Add money error:', error);
    res.status(500).json({ 
      message: 'Error adding money to wallet', 
      error: error.message 
    });
  }
};

// Get transactions
exports.getTransactions = async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
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
       ORDER BY transaction_date DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.status(200).json({
      transactions: transactions.map(t => ({
        ...t,
        amount: parseFloat(t.amount)
      }))
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      message: 'Error fetching transactions', 
      error: error.message 
    });
  }
};

// Get analytics
exports.getAnalytics = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get total balance from user's wallet and account
    const [userBalance] = await db.query(
      'SELECT COALESCE(wallet_balance, 0) + COALESCE(account_balance, 0) as total_balance FROM users WHERE user_id = ?',
      [userId]
    );

    // Get total transactions (with error handling for missing tables)
    let totalTransactions = 0;
    let monthlySpending = 0;
    
    try {
      const [transactionCount] = await db.query(
        'SELECT COUNT(*) as total_transactions FROM payments WHERE user_id = ?',
        [userId]
      );
      totalTransactions += transactionCount[0].total_transactions;
    } catch (error) {
      console.log('Payments table not found');
    }
    
    try {
      const [transferCount] = await db.query(
        'SELECT COUNT(*) as total_transfers FROM transfers WHERE from_user_id = ? OR to_user_id = ?',
        [userId, userId]
      );
      totalTransactions += transferCount[0].total_transfers;
    } catch (error) {
      console.log('Transfers table not found');
    }

    // Get this month spending
    try {
      const [paymentSpending] = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as spending 
         FROM payments 
         WHERE user_id = ? 
           AND payment_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`,
        [userId]
      );
      monthlySpending += parseFloat(paymentSpending[0].spending);
    } catch (error) {
      console.log('Payments table not found for monthly spending');
    }
    
    try {
      const [transferSpending] = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as spending 
         FROM transfers 
         WHERE from_user_id = ? 
           AND transfer_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`,
        [userId]
      );
      monthlySpending += parseFloat(transferSpending[0].spending);
    } catch (error) {
      console.log('Transfers table not found for monthly spending');
    }

    res.status(200).json({
      analytics: {
        total_balance: parseFloat(userBalance[0].total_balance || 0),
        total_transactions: totalTransactions,
        this_month_spending: monthlySpending
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      message: 'Error fetching analytics', 
      error: error.message 
    });
  }
};

// Get wallet balance and account balances with aggregate data
exports.getBalances = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user data from users table and wallet balance from wallets table
    const [userResult] = await db.query(
      'SELECT user_id, wallet_balance, account_balance, full_name, email FROM users WHERE user_id = ?',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult[0];
    
    // Prioritize users table wallet balance, only fallback to wallets table if needed
    let walletBalance = user.wallet_balance || 0;
    
    // Only use wallets table if users table doesn't have wallet_balance (check for null/undefined)
    if (user.wallet_balance === null || user.wallet_balance === undefined) {
      try {
        const [walletResult] = await db.query(
          'SELECT wallet_balance FROM wallets WHERE user_id = ?',
          [userId]
        );
        if (walletResult.length > 0) {
          walletBalance = walletResult[0].wallet_balance;
        }
      } catch (error) {
        console.log('Wallets table not found, using user table balance');
      }
    }

    // Get account balance from accounts table if it exists, otherwise use users table
    let accountBalance = user.account_balance || 0;
    let totalAccounts = 1;
    try {
      const [accountResult] = await db.query(
        'SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE user_id = ?',
        [userId]
      );
      if (accountResult.length > 0) {
        accountBalance = accountResult[0].total_balance;
        totalAccounts = accountResult[0].count;
      }
    } catch (error) {
      console.log('Accounts table not found, using user table balance');
    }

    // Get recent transaction stats from existing tables (with error handling)
    let paymentStats = { total_transactions: 0, total_amount: 0, average_amount: 0 };
    let transferStats = { total_transfers: 0, total_transfer_amount: 0 };
    
    try {
      const [paymentResult] = await db.query(
        `SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_amount,
          AVG(amount) as average_amount
         FROM payments 
         WHERE user_id = ? AND payment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [userId]
      );
      paymentStats = paymentResult[0] || paymentStats;
    } catch (error) {
      console.log('Payments table not found or empty');
    }
    
    try {
      const [transferResult] = await db.query(
        `SELECT 
          COUNT(*) as total_transfers,
          COALESCE(SUM(amount), 0) as total_transfer_amount
         FROM transfers 
         WHERE (from_user_id = ? OR to_user_id = ?) AND transfer_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [userId, userId]
      );
      transferStats = transferResult[0] || transferStats;
    } catch (error) {
      console.log('Transfers table not found or empty');
    }

    const totalTransactions = paymentStats.total_transactions + transferStats.total_transfers;
    const successfulTransactions = totalTransactions; // Assume all are successful for now
    const successRate = totalTransactions > 0 ? 100 : 0;

    res.status(200).json({
      wallet_balance: parseFloat(walletBalance || 0),
      account_balance: parseFloat(accountBalance || 0),
      total_accounts: totalAccounts || 1,
      average_account_balance: parseFloat(accountBalance || 0) / (totalAccounts || 1),
      transaction_stats: {
        total_transactions: totalTransactions,
        successful_transactions: successfulTransactions,
        failed_transactions: 0,
        success_rate: successRate,
        total_credits: parseFloat(transferStats.total_transfer_amount || 0),
        total_debits: parseFloat(paymentStats.total_amount || 0),
        net_flow: parseFloat((transferStats.total_transfer_amount || 0) - (paymentStats.total_amount || 0))
      }
    });

  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ 
      message: 'Error fetching balances', 
      error: error.message 
    });
  }
};

// Add funds to wallet
exports.addFunds = async (req, res) => {
  const userId = req.user.id;
  const { source, amount, note } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }

  if (!source || !['bank', 'upi', 'card'].includes(source)) {
    return res.status(400).json({ message: 'Valid source is required (bank, upi, card)' });
  }

  try {
    const referenceNumber = generateReferenceNumber();
    
    // Create transaction record
    const [transactionResult] = await db.query(
      `INSERT INTO transactions (user_id, transaction_type, amount, payment_method, status, description, reference_number) 
       VALUES (?, 'Deposit', ?, ?, 'Success', ?, ?)`,
      [userId, amount, source === 'bank' ? 'Bank Transfer' : source === 'upi' ? 'UPI' : 'Debit Card', note || 'Wallet top-up', referenceNumber]
    );

    // Update wallet balance (this will be handled by trigger, but we'll do it manually for immediate response)
    await db.query(
      'UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
      [amount, userId]
    );

    // Get updated balances
    const [updatedWallet] = await db.query(
      'SELECT wallet_balance FROM wallets WHERE user_id = ?',
      [userId]
    );

    const [updatedAccount] = await db.query(
      'SELECT COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      message: 'Funds added successfully!',
      transaction_id: transactionResult.insertId,
      reference_number: referenceNumber,
      balances: {
        wallet_balance: parseFloat(updatedWallet[0].wallet_balance),
        account_balance: parseFloat(updatedAccount[0].total_balance)
      }
    });

  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ 
      message: 'Error adding funds', 
      error: error.message 
    });
  }
};

// Move money between wallet and account
exports.move = async (req, res) => {
  const userId = req.user.id;
  const { direction, amount, note } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }

  if (!direction || !['account_to_wallet', 'wallet_to_account'].includes(direction)) {
    return res.status(400).json({ message: 'Valid direction is required' });
  }

  try {
    // Check if user has sufficient balance
    if (direction === 'wallet_to_account') {
      const [walletBalance] = await db.query(
        'SELECT wallet_balance FROM wallets WHERE user_id = ?',
        [userId]
      );
      
      if (!walletBalance.length || walletBalance[0].wallet_balance < amount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
    } else {
      const [accountBalance] = await db.query(
        'SELECT COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE user_id = ? AND is_primary = true',
        [userId]
      );
      
      if (!accountBalance.length || accountBalance[0].total_balance < amount) {
        return res.status(400).json({ message: 'Insufficient account balance' });
      }
    }

    const referenceNumber = generateReferenceNumber();
    const transactionType = direction === 'wallet_to_account' ? 'Transfer' : 'Deposit';
    const description = direction === 'wallet_to_account' ? 
      `Transfer from wallet to account${note ? ': ' + note : ''}` :
      `Transfer from account to wallet${note ? ': ' + note : ''}`;

    // Create transaction record
    const [transactionResult] = await db.query(
      `INSERT INTO transactions (user_id, transaction_type, amount, payment_method, status, description, reference_number) 
       VALUES (?, ?, ?, ?, 'Success', ?, ?)`,
      [userId, transactionType, amount, direction === 'wallet_to_account' ? 'Wallet' : 'Bank Transfer', description, referenceNumber]
    );

    // Update balances
    if (direction === 'wallet_to_account') {
      // Deduct from wallet, add to primary account
      await db.query(
        'UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
        [amount, userId]
      );
      await db.query(
        'UPDATE accounts SET balance = balance + ? WHERE user_id = ? AND is_primary = true',
        [amount, userId]
      );
    } else {
      // Deduct from primary account, add to wallet
      await db.query(
        'UPDATE accounts SET balance = balance - ? WHERE user_id = ? AND is_primary = true',
        [amount, userId]
      );
      await db.query(
        'UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
        [amount, userId]
      );
    }

    // Get updated balances
    const [updatedWallet] = await db.query(
      'SELECT wallet_balance FROM wallets WHERE user_id = ?',
      [userId]
    );

    const [updatedAccount] = await db.query(
      'SELECT COALESCE(SUM(balance), 0) as total_balance FROM accounts WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      message: 'Funds transferred successfully!',
      transaction_id: transactionResult.insertId,
      reference_number: referenceNumber,
      balances: {
        wallet_balance: parseFloat(updatedWallet[0].wallet_balance),
        account_balance: parseFloat(updatedAccount[0].total_balance)
      }
    });

  } catch (error) {
    console.error('Move funds error:', error);
    res.status(500).json({ 
      message: 'Error transferring funds', 
      error: error.message 
    });
  }
};

// Get wallet transaction ledger (adapted for existing schema)
exports.getLedger = async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
    // Get transactions from existing tables - combine payments and transfers
    let transactions = [];
    
    try {
      // Get payments
      const [payments] = await db.query(
        `SELECT 
          payment_id as transaction_id,
          'Payment' as transaction_type,
          amount,
          payment_method,
          'Success' as status,
          description,
          reference_number,
          payment_date as transaction_date
         FROM payments 
         WHERE user_id = ? 
         ORDER BY payment_date DESC
         LIMIT ?`,
        [userId, parseInt(limit)]
      );
      
      transactions = [...transactions, ...payments];
    } catch (paymentError) {
      console.log('Payments table not found or empty');
    }
    
    try {
      // Get transfers
      const [transfers] = await db.query(
        `SELECT 
          transfer_id as transaction_id,
          CASE 
            WHEN from_user_id = ? THEN 'Transfer Sent'
            ELSE 'Transfer Received'
          END as transaction_type,
          amount,
          source_type as payment_method,
          status,
          note as description,
          transfer_reference as reference_number,
          transfer_date as transaction_date
         FROM transfers 
         WHERE from_user_id = ? OR to_user_id = ?
         ORDER BY transfer_date DESC
         LIMIT ?`,
        [userId, userId, userId, parseInt(limit)]
      );
      
      transactions = [...transactions, ...transfers];
    } catch (transferError) {
      console.log('Transfers table not found or empty');
    }
    
    // Sort by date and limit
    transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
    transactions = transactions.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Get total count for pagination
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      transactions,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + parseInt(limit)) < countResult[0].total
      }
    });

  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ 
      message: 'Error fetching transaction ledger', 
      error: error.message 
    });
  }
};

// Get spending analytics (aggregate functions)
exports.getSpendingAnalytics = async (req, res) => {
  const userId = req.user.id;
  const { period = '30' } = req.query; // days

  try {
    // Category-wise spending
    const [categorySpending] = await db.query(
      `SELECT 
        COALESCE(s.category, 'Other') as category,
        COUNT(t.transaction_id) as transaction_count,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount,
        MAX(t.amount) as highest_amount,
        MIN(t.amount) as lowest_amount
       FROM transactions t
       LEFT JOIN services s ON t.service_id = s.service_id
       WHERE t.user_id = ? 
         AND t.status = 'Success' 
         AND t.transaction_type IN ('Payment', 'Bill Payment')
         AND t.transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY s.category
       ORDER BY total_amount DESC`,
      [userId, parseInt(period)]
    );

    // Daily spending trend
    const [dailySpending] = await db.query(
      `SELECT 
        DATE(transaction_date) as spending_date,
        COUNT(*) as transaction_count,
        SUM(amount) as daily_total,
        AVG(amount) as daily_average
       FROM transactions
       WHERE user_id = ? 
         AND status = 'Success' 
         AND transaction_type IN ('Payment', 'Bill Payment')
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(transaction_date)
       ORDER BY spending_date DESC
       LIMIT 30`,
      [userId, parseInt(period)]
    );

    // Payment method analysis
    const [paymentMethodStats] = await db.query(
      `SELECT 
        payment_method,
        COUNT(*) as usage_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions WHERE user_id = ? AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY))) as usage_percentage
       FROM transactions
       WHERE user_id = ? 
         AND status = 'Success' 
         AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY payment_method
       ORDER BY usage_count DESC`,
      [userId, parseInt(period), userId, parseInt(period)]
    );

    res.status(200).json({
      period_days: parseInt(period),
      category_wise_spending: categorySpending.map(item => ({
        ...item,
        total_amount: parseFloat(item.total_amount),
        average_amount: parseFloat(item.average_amount),
        highest_amount: parseFloat(item.highest_amount),
        lowest_amount: parseFloat(item.lowest_amount)
      })),
      daily_spending_trend: dailySpending.map(item => ({
        ...item,
        daily_total: parseFloat(item.daily_total),
        daily_average: parseFloat(item.daily_average)
      })),
      payment_method_stats: paymentMethodStats.map(item => ({
        ...item,
        total_amount: parseFloat(item.total_amount),
        average_amount: parseFloat(item.average_amount),
        usage_percentage: parseFloat(item.usage_percentage).toFixed(2)
      }))
    });

  } catch (error) {
    console.error('Get spending analytics error:', error);
    res.status(500).json({ 
      message: 'Error fetching spending analytics', 
      error: error.message 
    });
  }
};
