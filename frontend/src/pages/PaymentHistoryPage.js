import React, { useState, useEffect } from 'react';
import api from '../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PaymentHistoryPage = () => {
  // We add some initial placeholder data to see the styles.
  const [payments, setPayments] = useState([
    { payment_id: 1, amount: '150.00', payment_mode: 'UPI', date_of_transaction: '2025-08-24T00:00:00.000Z', notes: 'Coffee Shop' },
    { payment_id: 2, amount: '2500.00', payment_mode: 'Card', date_of_transaction: '2025-08-23T00:00:00.000Z', notes: 'Groceries' },
    { payment_id: 3, amount: '80.00', payment_mode: 'Cash', date_of_transaction: '2025-08-22T00:00:00.000Z', notes: 'Lunch' },
  ]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // The original function to fetch data is kept for when you connect the backend.
  const fetchPayments = async () => {
    try {
      const params = (startDate && endDate) ? { startDate, endDate } : {};
      const res = await api.get('/payments/history', { params });
      setPayments(res.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      // In case of error, you might want to clear the list or show a message
      // For now, we'll just log it.
    }
  };

  // Uncomment this useEffect hook when you want to connect to the backend again.
  // useEffect(() => {
  //   fetchPayments();
  // }, []);

  const handleFilter = () => {
    // This will work once the backend is connected.
    fetchPayments();
  };
  
  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.text("Payment History", 20, 10);
    doc.autoTable({
        head: [['ID', 'Amount', 'Mode', 'Date', 'Notes']],
        body: payments.map(p => [p.payment_id, p.amount, p.payment_mode, new Date(p.date_of_transaction).toLocaleDateString(), p.notes]),
    });
    doc.save('payment-history.pdf');
  };

  return (
    <div className="history-container">
      <header className="history-header">
        <h1>Payment History</h1>
      </header>
      
      <div className="filter-section">
        <div className="date-filters">
          <div className="date-input-group">
            <label htmlFor="startDate">From</label>
            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="date-input-group">
            <label htmlFor="endDate">To</label>
            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="action-buttons-group">
          <button onClick={handleFilter} className="filter-button">Filter</button>
          <button onClick={downloadPdf} className="download-button">Download PDF</button>
        </div>
      </div>

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Payment Mode</th>
              <th>Notes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.payment_id}>
                <td>{new Date(p.date_of_transaction).toLocaleDateString()}</td>
                <td>${p.amount}</td>
                <td>{p.payment_mode}</td>
                <td>{p.notes}</td>
                <td>
                  {/* Example of conditional status */}
                  <span className={p.amount > 1000 ? 'status-successful' : 'status-processing'}>
                    {p.amount > 1000 ? 'Successful' : 'Processing'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentHistoryPage;