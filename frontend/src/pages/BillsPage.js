import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrpc } from '../trpc/TrpcProvider.jsx';

const BillsPage = () => {
  const navigate = useNavigate();
  const trpc = useTrpc();
  const [bills, setBills] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddBill, setShowAddBill] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [filter, setFilter] = useState('all');

  // New bill form
  const [newBill, setNewBill] = useState({
    provider_name: '',
    bill_type: 'Electricity',
    amount: '',
    due_date: ''
  });

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState('Wallet');
  const [userAccounts, setUserAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    loadBills();
  }, [filter]);

  useEffect(() => {
    if (paymentMethod === 'Bank Transfer' && selectedBill && userAccounts.length === 0) {
      loadUserAccounts();
    }
  }, [paymentMethod, selectedBill]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const response = await trpc.bill.list.query();
      
      // Handle new response structure
      if (response && response.bills) {
        setBills(response.bills || []);
        setStatistics(response.statistics || {});
        
        // Filter bills based on current filter
        let filteredBills = response.bills;
        if (filter !== 'all') {
          filteredBills = response.bills.filter(bill => bill.status === filter || bill.computed_status === filter);
        }
        setBills(filteredBills);
        
        // Get upcoming bills (next 7 days)
        const upcoming = response.bills.filter(bill => {
          return bill.status === 'Pending' && bill.days_until_due <= 7 && bill.days_until_due >= 0;
        });
        setUpcomingBills(upcoming);
      } else {
        // Fallback for old response format
        setBills(response || []);
        setStatistics({});
        setUpcomingBills([]);
      }
    } catch (err) {
      setError('Failed to load bills');
      console.error('Bills error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const accounts = await trpc.bill.getUserAccounts.query();
      setUserAccounts(accounts || []);
      // Auto-select the primary account if available
      const primaryAccount = accounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.account_id.toString());
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].account_id.toString());
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Convert amount to number and validate
      const amount = parseFloat(newBill.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      const billData = {
        ...newBill,
        amount: amount
      };
      
      await trpc.bill.create.mutate(billData);
      setSuccess('Bill added successfully!');
      setShowAddBill(false);
      setNewBill({
        provider_name: '',
        bill_type: 'Electricity',
        amount: '',
        due_date: ''
      });
      loadBills();
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to add bill');
    }
  };

  const handlePayBill = async (billId) => {
    setError('');
    setSuccess('');

    // Validation for bank transfer
    if (paymentMethod === 'Bank Transfer' && !selectedAccountId) {
      setError('Please select a bank account');
      return;
    }

    try {
      const paymentData = {
        bill_id: billId,
        payment_method: paymentMethod,
        notes: 'Bill payment from dashboard'
      };

      // Add account ID for bank transfers
      if (paymentMethod === 'Bank Transfer' && selectedAccountId) {
        paymentData.account_id = parseInt(selectedAccountId);
      }

      const response = await trpc.bill.pay.mutate(paymentData);
      setSuccess(`Bill paid successfully! Reference: ${response.transaction.reference_number}`);
      setSelectedBill(null);
      setPaymentMethod('Wallet'); // Reset to default
      setSelectedAccountId('');
      setUserAccounts([]); // Clear accounts cache
      loadBills();
      
      // Dispatch event to refresh dashboard if needed
      window.dispatchEvent(new Event('balanceUpdated'));
    } catch (err) {
      setError(err?.message || 'Failed to pay bill');
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    try {
      await trpc.bill.delete.mutate({ bill_id: billId });
      setSuccess('Bill deleted successfully!');
      loadBills();
    } catch (err) {
      setError(err?.message || 'Failed to delete bill');
    }
  };

  const currency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getBillTypeIcon = (type) => {
    const icons = {
      Electricity: '⚡',
      Water: '💧',
      Gas: '🔥',
      Internet: '🌐',
      Mobile: '📱',
      DTH: '📺',
      Insurance: '🛡️',
      Loan: '💳',
      'Credit Card': '💳',
      Other: '📄'
    };
    return icons[type] || '📄';
  };

  const getStatusColor = (status, dueDate) => {
    if (status === 'Paid') return '#4ECDC4';
    if (status === 'Overdue' || (new Date(dueDate) < new Date() && status === 'Pending')) return '#FF6B6B';
    return '#FFD93D';
  };

  const billTypes = ['Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'DTH', 'Insurance', 'Loan', 'Credit Card', 'Other'];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#666', fontSize: '18px', margin: 0 }}>Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '20px 30px',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>
            📄 Bills Management
          </h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '16px' }}>
            Manage and pay your bills efficiently
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddBill(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            ➕ Add Bill
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            🏠 Dashboard
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '25px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(255, 107, 107, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Total Bills</h3>
          <p style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: '700' }}>
            {statistics.total_bills || 0}
          </p>
          <p style={{ margin: 0, fontSize: '14px', opacity: '0.8' }}>
            All time bills
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #FFD93D 0%, #FF8700 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(255, 217, 61, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Pending Amount</h3>
          <p style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: '700' }}>
            {currency(statistics.pending_amount)}
          </p>
          <p style={{ margin: 0, fontSize: '14px', opacity: '0.8' }}>
            {statistics.pending_bills || 0} pending bills
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(78, 205, 196, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Paid Amount</h3>
          <p style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: '700' }}>
            {currency(statistics.paid_amount)}
          </p>
          <p style={{ margin: 0, fontSize: '14px', opacity: '0.8' }}>
            {statistics.paid_bills || 0} paid bills
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #A8E6CF 0%, #88D8C0 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(168, 230, 207, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Average Bill</h3>
          <p style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: '700' }}>
            {currency(statistics.average_bill_amount)}
          </p>
          <p style={{ margin: 0, fontSize: '14px', opacity: '0.8' }}>
            Per bill amount
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '25px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {['all', 'Pending', 'Paid', 'Overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                background: filter === status ? '#667eea' : 'transparent',
                color: filter === status ? 'white' : '#666',
                border: `2px solid ${filter === status ? '#667eea' : '#ddd'}`,
                borderRadius: '10px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              {status === 'all' ? 'All Bills' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Bills List */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 25px', color: '#333', fontSize: '22px', fontWeight: '600' }}>
          Your Bills
        </h2>

        {bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📄</div>
            <h3 style={{ margin: '0 0 10px' }}>No bills found</h3>
            <p style={{ margin: 0, fontSize: '16px' }}>Add your first bill to get started</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {bills.map((bill) => (
              <div key={bill.bill_id} style={{
                background: 'white',
                border: `2px solid ${getStatusColor(bill.status, bill.due_date)}`,
                borderRadius: '15px',
                padding: '20px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ fontSize: '32px', marginRight: '15px' }}>
                    {getBillTypeIcon(bill.bill_type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 5px', color: '#333', fontSize: '18px' }}>
                      {bill.provider_name}
                    </h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                      {bill.bill_type}
                    </p>
                  </div>
                  <div style={{
                    background: getStatusColor(bill.status, bill.due_date),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {bill.computed_status || bill.status}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#666' }}>Amount:</span>
                    <span style={{ fontWeight: '700', color: '#333', fontSize: '16px' }}>
                      {currency(bill.amount)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#666' }}>Due Date:</span>
                    <span style={{ color: '#333' }}>
                      {new Date(bill.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  {bill.days_until_due !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#666' }}>Days Until Due:</span>
                      <span style={{ 
                        color: bill.days_until_due < 0 ? '#FF6B6B' : bill.days_until_due <= 3 ? '#FFD93D' : '#4ECDC4',
                        fontWeight: '600'
                      }}>
                        {bill.days_until_due < 0 ? `${Math.abs(bill.days_until_due)} days overdue` : `${bill.days_until_due} days`}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {bill.status === 'Pending' && (
                    <button
                      onClick={() => setSelectedBill(bill)}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      💳 Pay Now
                    </button>
                  )}
                  {bill.status !== 'Paid' && (
                    <button
                      onClick={() => handleDeleteBill(bill.bill_id)}
                      style={{
                        background: '#FF6B6B',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 15px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Bill Modal */}
      {showAddBill && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 25px', color: '#333', fontSize: '24px', fontWeight: '600' }}>
              Add New Bill
            </h2>
            
            <form onSubmit={handleAddBill}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontWeight: '500' }}>
                  Provider Name
                </label>
                <input
                  type="text"
                  value={newBill.provider_name}
                  onChange={(e) => setNewBill({ ...newBill, provider_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '16px',
                    transition: 'all 0.3s ease'
                  }}
                  placeholder="e.g., BESCOM, Airtel"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontWeight: '500' }}>
                  Bill Type
                </label>
                <select
                  value={newBill.bill_type}
                  onChange={(e) => setNewBill({ ...newBill, bill_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '16px',
                    background: 'white'
                  }}
                  required
                >
                  {billTypes.map(type => (
                    <option key={type} value={type}>
                      {getBillTypeIcon(type)} {type}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontWeight: '500' }}>
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '16px'
                  }}
                  placeholder="0.00"
                  required
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontWeight: '500' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={newBill.due_date}
                  onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '10px',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddBill(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ddd',
                    color: '#666',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Add Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {selectedBill && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 25px', color: '#333', fontSize: '24px', fontWeight: '600' }}>
              Pay Bill
            </h2>
            
            <div style={{
              background: '#f8f9fa',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '25px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ fontSize: '32px', marginRight: '15px' }}>
                  {getBillTypeIcon(selectedBill.bill_type)}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 5px', fontSize: '18px' }}>{selectedBill.provider_name}</h3>
                  <p style={{ margin: 0, color: '#666' }}>{selectedBill.bill_type}</p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Amount:</span>
                <span style={{ fontWeight: '700', fontSize: '18px', color: '#FF6B6B' }}>
                  {currency(selectedBill.amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Due Date:</span>
                <span>{new Date(selectedBill.due_date).toLocaleDateString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '10px', color: '#666', fontWeight: '500' }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  if (e.target.value === 'Bank Transfer') {
                    loadUserAccounts();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '16px',
                  background: 'white'
                }}
              >
                <option value="Wallet">💳 Wallet</option>
                <option value="Bank Transfer">🏦 Bank Transfer</option>
              </select>
            </div>

            {/* Account Selection for Bank Transfer */}
            {paymentMethod === 'Bank Transfer' && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#666', fontWeight: '500' }}>
                  Select Account
                </label>
                {loadingAccounts ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    Loading accounts...
                  </div>
                ) : userAccounts.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#FF6B6B' }}>
                    No bank accounts found. Please add an account first.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #ddd',
                      borderRadius: '10px',
                      fontSize: '16px',
                      background: 'white'
                    }}
                    required
                  >
                    <option value="">Choose an account</option>
                    {userAccounts.map(account => {
                      const accountBalance = account.balance || 0;
                      const canAfford = accountBalance >= selectedBill.amount;
                      return (
                        <option 
                          key={account.account_id} 
                          value={account.account_id.toString()}
                          disabled={!canAfford}
                        >
                          {account.bank_name} ({account.bank_type}) - ₹{accountBalance.toFixed(2)}
                          {account.is_primary ? ' (Primary)' : ''}
                          {!canAfford ? ' - Insufficient Balance' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => setSelectedBill(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#ddd',
                  color: '#666',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handlePayBill(selectedBill.bill_id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Pay {currency(selectedBill.amount)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {(error || success) && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: error ? '#FF6B6B' : '#4ECDC4',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 1000,
          maxWidth: '400px'
        }}>
          {error || success}
          <button
            onClick={() => {
              setError('');
              setSuccess('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '18px',
              cursor: 'pointer',
              float: 'right',
              marginLeft: '10px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BillsPage;