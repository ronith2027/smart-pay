const db = require('../config/db');

exports.getPaymentHistory = async (req, res) => {
  const userId = req.user.id; // From JWT middleware
  const { startDate, endDate } = req.query;

  let query = 'SELECT * FROM payments WHERE user_id = ?';
  const params = [userId];

  if (startDate && endDate) {
    query += ' AND date_of_transaction BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else {
    query += ' ORDER BY date_of_entry DESC LIMIT 10';
  }

  try {
    const [payments] = await db.query(query, params);
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment history', error: error.message });
  }
};

exports.addPayment = async (req, res) => {
  const userId = req.user.id;
  const { amount, payment_mode, date_of_transaction, notes } = req.body;

  if (!amount || !payment_mode || !date_of_transaction) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO payments (user_id, amount, payment_mode, date_of_transaction, notes) VALUES (?, ?, ?, ?, ?)',
      [userId, amount, payment_mode, date_of_transaction, notes || null]
    );
    res.status(201).json({ message: 'Payment added successfully!', paymentId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Error adding payment', error: error.message });
  }
};