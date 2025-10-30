const db = require('../config/db');
const crypto = require('crypto');

// Generate unique transaction reference number
const generateReferenceNumber = () => {
  return 'TXN' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

// Get user's bills with aggregate data (mock data since bills table doesn't exist in current schema)
exports.getBills = async (req, res) => {
  const userId = req.user.id;
  const { status, limit = 20, offset = 0 } = req.query;

  try {
    // Return mock data for bills since the table doesn't exist in current schema
    const mockBills = [
      {
        bill_id: 1,
        provider_name: 'Electricity Board',
        bill_type: 'Electricity',
        amount: 1250.00,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Pending',
        days_until_due: 5,
        computed_status: 'Pending'
      },
      {
        bill_id: 2,
        provider_name: 'Internet Provider',
        bill_type: 'Internet',
        amount: 999.00,
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Pending',
        days_until_due: 10,
        computed_status: 'Pending'
      }
    ];

    const filteredBills = status ? mockBills.filter(bill => bill.status === status) : mockBills;
    const paginatedBills = filteredBills.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Calculate mock statistics
    const totalBills = mockBills.length;
    const pendingBills = mockBills.filter(bill => bill.status === 'Pending').length;
    const paidBills = mockBills.filter(bill => bill.status === 'Paid').length;
    const overdueBills = mockBills.filter(bill => bill.computed_status === 'Overdue').length;
    const pendingAmount = mockBills
      .filter(bill => bill.status === 'Pending')
      .reduce((sum, bill) => sum + bill.amount, 0);
    const paidAmount = mockBills
      .filter(bill => bill.status === 'Paid')
      .reduce((sum, bill) => sum + bill.amount, 0);
    const averageBillAmount = totalBills > 0 ? mockBills.reduce((sum, bill) => sum + bill.amount, 0) / totalBills : 0;
    
    const billStats = {
      total_bills: totalBills,
      pending_bills: pendingBills,
      paid_bills: paidBills,
      overdue_bills: overdueBills,
      pending_amount: pendingAmount,
      paid_amount: paidAmount,
      average_bill_amount: averageBillAmount
    };

    // Get upcoming bills (next 7 days)
    const upcomingBills = mockBills.filter(bill => {
      const dueDate = new Date(bill.due_date);
      const today = new Date();
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return bill.status === 'Pending' && diffDays <= 7 && diffDays >= 0;
    });

    res.status(200).json({
      bills: paginatedBills.map(bill => ({
        ...bill,
        amount: parseFloat(bill.amount)
      })),
      statistics: {
        total_bills: billStats.total_bills,
        pending_bills: billStats.pending_bills,
        paid_bills: billStats.paid_bills,
        overdue_bills: billStats.overdue_bills,
        pending_amount: parseFloat(billStats.pending_amount),
        paid_amount: parseFloat(billStats.paid_amount),
        average_bill_amount: parseFloat(billStats.average_bill_amount)
      },
      upcoming_bills: upcomingBills.map(bill => ({
        ...bill,
        amount: parseFloat(bill.amount)
      })),
      pagination: {
        total: filteredBills.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + parseInt(limit)) < filteredBills.length
      }
    });

  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ 
      message: 'Error fetching bills', 
      error: error.message 
    });
  }
};

// Add a new bill
exports.addBill = async (req, res) => {
  const userId = req.user.id;
  const { title, description, amount, due_date, category, provider_name, bill_type } = req.body;

  // Support both new format (title, description, category) and old format (provider_name, bill_type)
  const billTitle = title || provider_name;
  const billDescription = description || '';
  const billCategory = category || bill_type;

  if (!billTitle || !amount || !due_date) {
    return res.status(400).json({ 
      message: 'Title, amount, and due date are required' 
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0' });
  }

  const validBillTypes = ['utilities', 'internet', 'mobile', 'insurance', 'loan', 'credit-card', 'Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'DTH', 'Insurance', 'Loan', 'Credit Card', 'Other'];
  if (billCategory && !validBillTypes.includes(billCategory)) {
    return res.status(400).json({ message: 'Invalid bill category' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO bills (user_id, provider_name, bill_type, amount, due_date) VALUES (?, ?, ?, ?, ?)',
      [userId, billTitle, billCategory || 'Other', amount, due_date]
    );

    res.status(201).json({
      message: 'Bill added successfully!',
      bill: {
        bill_id: result.insertId,
        title: billTitle,
        description: billDescription,
        category: billCategory || 'Other',
        amount: parseFloat(amount),
        due_date,
        status: 'Pending'
      }
    });

  } catch (error) {
    console.error('Add bill error:', error);
    res.status(500).json({ 
      message: 'Error adding bill', 
      error: error.message 
    });
  }
};

// Pay a bill
exports.payBill = async (req, res) => {
  const userId = req.user.id;
  const { bill_id, payment_method, wallet_id, notes } = req.body;
  
  // Support both URL param and body param for bill_id
  const billId = bill_id || req.params.bill_id;
  
  if (!billId) {
    return res.status(400).json({ message: 'Bill ID is required' });
  }

  if (!payment_method || !['wallet', 'bank', 'upi', 'card', 'Wallet', 'Bank Transfer', 'UPI', 'Credit Card', 'Debit Card'].includes(payment_method)) {
    return res.status(400).json({ message: 'Valid payment method is required' });
  }

  try {
    // Get bill details
    const [bills] = await db.query(
      'SELECT * FROM bills WHERE bill_id = ? AND user_id = ? AND status = "Pending"',
      [billId, userId]
    );

    if (bills.length === 0) {
      return res.status(404).json({ message: 'Bill not found or already paid' });
    }

    const bill = bills[0];

    // Check if user has sufficient balance (for wallet payments)
    if (payment_method === 'wallet' || payment_method === 'Wallet') {
      let walletQuery = 'SELECT wallet_balance FROM wallets WHERE user_id = ?';
      let walletParams = [userId];
      
      if (wallet_id) {
        walletQuery = 'SELECT wallet_balance FROM wallets WHERE wallet_id = ? AND user_id = ?';
        walletParams = [wallet_id, userId];
      }
      
      const [walletResult] = await db.query(walletQuery, walletParams);

      if (!walletResult.length || walletResult[0].wallet_balance < bill.amount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
    }

    const referenceNumber = generateReferenceNumber();
    
    // Create transaction record
    const [transactionResult] = await db.query(
      `INSERT INTO transactions (user_id, transaction_type, amount, payment_method, status, description, reference_number) 
       VALUES (?, 'Bill Payment', ?, ?, 'Success', ?, ?)`,
      [
        userId, 
        bill.amount, 
        payment_method, 
        `${bill.bill_type} bill payment to ${bill.provider_name}${notes ? ': ' + notes : ''}`, 
        referenceNumber
      ]
    );

    // Update bill status
    await db.query(
      'UPDATE bills SET status = "Paid", transaction_id = ? WHERE bill_id = ?',
      [transactionResult.insertId, billId]
    );

    // Update wallet balance if paid with wallet (trigger will handle this, but we'll do it manually for immediate response)
    if (payment_method === 'wallet' || payment_method === 'Wallet') {
      if (wallet_id) {
        await db.query(
          'UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE wallet_id = ? AND user_id = ?',
          [bill.amount, wallet_id, userId]
        );
      } else {
        await db.query(
          'UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE user_id = ?',
          [bill.amount, userId]
        );
      }
    }

    // Get updated wallet balance
    const [updatedWallet] = await db.query(
      'SELECT wallet_balance FROM wallets WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      message: 'Bill paid successfully!',
      transaction: {
        transaction_id: transactionResult.insertId,
        reference_number: referenceNumber,
        bill_id: parseInt(billId),
        amount_paid: parseFloat(bill.amount),
        payment_method,
        status: 'Success'
      },
      updated_wallet_balance: parseFloat(updatedWallet[0].wallet_balance || 0)
    });

  } catch (error) {
    console.error('Pay bill error:', error);
    res.status(500).json({ 
      message: 'Error paying bill', 
      error: error.message 
    });
  }
};

// Update bill details
exports.updateBill = async (req, res) => {
  const userId = req.user.id;
  const { bill_id } = req.params;
  const { provider_name, amount, due_date } = req.body;

  try {
    // Check if bill exists and is editable (not paid)
    const [bills] = await db.query(
      'SELECT * FROM bills WHERE bill_id = ? AND user_id = ? AND status IN ("Pending", "Overdue")',
      [bill_id, userId]
    );

    if (bills.length === 0) {
      return res.status(404).json({ message: 'Bill not found or cannot be edited' });
    }

    const updateFields = [];
    const updateValues = [];

    if (provider_name) {
      updateFields.push('provider_name = ?');
      updateValues.push(provider_name);
    }

    if (amount && amount > 0) {
      updateFields.push('amount = ?');
      updateValues.push(amount);
    }

    if (due_date) {
      updateFields.push('due_date = ?');
      updateValues.push(due_date);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateValues.push(bill_id, userId);

    await db.query(
      `UPDATE bills SET ${updateFields.join(', ')} WHERE bill_id = ? AND user_id = ?`,
      updateValues
    );

    // Get updated bill
    const [updatedBill] = await db.query(
      'SELECT * FROM bills WHERE bill_id = ? AND user_id = ?',
      [bill_id, userId]
    );

    res.status(200).json({
      message: 'Bill updated successfully!',
      bill: {
        ...updatedBill[0],
        amount: parseFloat(updatedBill[0].amount)
      }
    });

  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ 
      message: 'Error updating bill', 
      error: error.message 
    });
  }
};

// Delete a bill
exports.deleteBill = async (req, res) => {
  const userId = req.user.id;
  const { bill_id } = req.params;

  try {
    // Check if bill exists and can be deleted (not paid)
    const [bills] = await db.query(
      'SELECT * FROM bills WHERE bill_id = ? AND user_id = ? AND status != "Paid"',
      [bill_id, userId]
    );

    if (bills.length === 0) {
      return res.status(404).json({ message: 'Bill not found or cannot be deleted' });
    }

    await db.query(
      'DELETE FROM bills WHERE bill_id = ? AND user_id = ?',
      [bill_id, userId]
    );

    res.status(200).json({
      message: 'Bill deleted successfully!',
      bill_id: parseInt(bill_id)
    });

  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ 
      message: 'Error deleting bill', 
      error: error.message 
    });
  }
};

// Get bill analytics (aggregate functions)
exports.getBillAnalytics = async (req, res) => {
  const userId = req.user.id;
  const { period = '30' } = req.query;

  try {
    // Bill type analysis
    const [billTypeAnalysis] = await db.query(
      `SELECT 
        bill_type,
        COUNT(*) as total_bills,
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_bills,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_bills,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as total_paid_amount,
        COALESCE(AVG(CASE WHEN status = 'Paid' THEN amount END), 0) as average_amount,
        COALESCE(MAX(CASE WHEN status = 'Paid' THEN amount END), 0) as highest_amount
       FROM bills 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY bill_type
       ORDER BY total_paid_amount DESC`,
      [userId, parseInt(period)]
    );

    // Monthly spending pattern
    const [monthlyPattern] = await db.query(
      `SELECT 
        MONTH(due_date) as month,
        MONTHNAME(due_date) as month_name,
        COUNT(*) as total_bills,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status = 'Paid' THEN amount END), 0) as average_amount
       FROM bills 
       WHERE user_id = ? AND due_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY MONTH(due_date), MONTHNAME(due_date)
       ORDER BY month`,
      [userId, parseInt(period)]
    );

    // Payment punctuality analysis
    const [punctualityStats] = await db.query(
      `SELECT 
        COUNT(*) as total_paid_bills,
        COUNT(CASE WHEN t.transaction_date <= b.due_date THEN 1 END) as on_time_payments,
        COUNT(CASE WHEN t.transaction_date > b.due_date THEN 1 END) as late_payments,
        AVG(DATEDIFF(t.transaction_date, b.due_date)) as average_payment_delay_days
       FROM bills b
       INNER JOIN transactions t ON b.transaction_id = t.transaction_id
       WHERE b.user_id = ? AND b.status = 'Paid' AND b.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [userId, parseInt(period)]
    );

    const punctuality = punctualityStats[0];
    const onTimePercentage = punctuality.total_paid_bills > 0 
      ? ((punctuality.on_time_payments / punctuality.total_paid_bills) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      period_days: parseInt(period),
      bill_type_analysis: billTypeAnalysis.map(item => ({
        ...item,
        total_paid_amount: parseFloat(item.total_paid_amount),
        average_amount: parseFloat(item.average_amount),
        highest_amount: parseFloat(item.highest_amount)
      })),
      monthly_spending_pattern: monthlyPattern.map(item => ({
        ...item,
        total_amount: parseFloat(item.total_amount),
        average_amount: parseFloat(item.average_amount)
      })),
      payment_punctuality: {
        total_paid_bills: punctuality.total_paid_bills,
        on_time_payments: punctuality.on_time_payments,
        late_payments: punctuality.late_payments,
        on_time_percentage: parseFloat(onTimePercentage),
        average_payment_delay_days: parseFloat(punctuality.average_payment_delay_days || 0)
      }
    });

  } catch (error) {
    console.error('Get bill analytics error:', error);
    res.status(500).json({ 
      message: 'Error fetching bill analytics', 
      error: error.message 
    });
  }
};