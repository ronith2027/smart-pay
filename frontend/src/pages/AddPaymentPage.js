import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AddPaymentPage = () => {
  const [formData, setFormData] = useState({
    amount: '',
    payment_mode: 'UPI',
    date_of_transaction: '',
    notes: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments/add', formData);
      alert('Payment added successfully!');
      navigate('/dashboard');
    } catch (error) {
      alert('Failed to add payment.');
    }
  };

  return (
    <div className="payment-container">
      <form className="payment-card" onSubmit={handleSubmit}>
        <header className="payment-header">
          <h2>Add Payment</h2>
        </header>

        <div className="amount-section">
          <span className="currency-symbol">$</span>
          <input
            type="number"
            name="amount"
            className="amount-input"
            placeholder="0.00"
            value={formData.amount}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group-inline">
          <label>Payment Method</label>
          <select name="payment_mode" onChange={handleChange} value={formData.payment_mode}>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Netbanking">Netbanking</option>
            <option value="Cash">Cash</option>
          </select>
        </div>

        <div className="form-group-inline">
          <label>Date of Transaction</label>
          <input type="date" name="date_of_transaction" onChange={handleChange} required />
        </div>

        <div className="form-group-inline">
          <label>Notes</label>
          <input type="text" name="notes" placeholder="e.g., Dinner with friends" onChange={handleChange} />
        </div>

        <button type="submit" className="submit-payment-btn">Add Payment</button>
      </form>
    </div>
  );
};

export default AddPaymentPage;