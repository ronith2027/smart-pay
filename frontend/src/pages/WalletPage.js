import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrpc } from '../trpc/TrpcProvider.jsx';

const WalletPage = () => {
  const navigate = useNavigate();
  const trpc = useTrpc();
  const [balances, setBalances] = useState({ wallet_balance: 0, total_account_balance: 0 });
  const [accounts, setAccounts] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyForm, setAddMoneyForm] = useState({
    account_id: '',
    amount: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [balancesRes, accountsRes, ledgerRes] = await Promise.all([
        trpc.wallet.getBalances.query(),
        trpc.account.list.query(),
        trpc.wallet.getLedger.query(),
      ]);
      setBalances(balancesRes);
      setAccounts(accountsRes || []);
      setLedger(ledgerRes || []);
    } catch (err) {
      setError('Failed to load wallet data');
      console.error('Wallet error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!addMoneyForm.account_id || !addMoneyForm.amount || addMoneyForm.amount <= 0) {
      setError('Please select an account and enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = await trpc.wallet.addFromAccount.mutate({
        account_id: parseInt(addMoneyForm.account_id),
        amount: parseFloat(addMoneyForm.amount),
        note: addMoneyForm.note
      });

      setSuccess(result.message);
      setShowAddMoney(false);
      setAddMoneyForm({ account_id: '', amount: '', note: '' });
      
      // Refresh data
      await loadWalletData();
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('accountBalanceChanged'));
      
    } catch (err) {
      setError(err?.message || 'Failed to add money to wallet');
    } finally {
      setSubmitting(false);
    }
  };

  const currency = (amount) => {
    // Ensure amount is never negative
    const safeAmount = Math.max(0, Number(amount) || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(safeAmount);
  };

  const getTransactionTypeIcon = (type) => {
    const icons = {
      'add_funds_wallet': '💰',
      'add_funds_account': '🏦',
      'wallet_to_account': '📤',
      'account_to_wallet': '📥',
      'wallet_transfer': '💸',
      'account_deposit': '💳',
      'default': '💱'
    };
    return icons[type] || icons.default;
  };

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
          <p style={{ color: '#666', fontSize: '18px', margin: 0 }}>Loading wallet...</p>
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
            💰 Wallet Management
          </h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '16px' }}>
            Add money from your bank accounts to wallet
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddMoney(true)}
            disabled={accounts.length === 0}
            style={{
              background: accounts.length === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
              color: accounts.length === 0 ? 'rgba(255, 255, 255, 0.5)' : 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: accounts.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            💰 Add Money
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

      {/* Balance Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '25px',
        marginBottom: '30px'
      }}>
        {/* Wallet Balance */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 15px 35px rgba(255, 107, 107, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            fontSize: '100px',
            opacity: '0.1'
          }}>💳</div>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Current Wallet Balance</h3>
          <p style={{ margin: '0 0 15px', fontSize: '32px', fontWeight: '700' }}>
            {currency(Math.max(0, balances.wallet_balance || 0))}
          </p>
          <div style={{ fontSize: '14px', opacity: '0.9' }}>
            <span>💰 Available for spending</span>
          </div>
        </div>

        {/* Account Balance */}
        <div style={{
          background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 15px 35px rgba(78, 205, 196, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            fontSize: '100px',
            opacity: '0.1'
          }}>🏦</div>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Total Account Balance</h3>
          <p style={{ margin: '0 0 15px', fontSize: '32px', fontWeight: '700' }}>
            {currency(balances.total_account_balance || 0)}
          </p>
          <div style={{ fontSize: '14px', opacity: '0.9' }}>
            <span>🏦 {accounts.length} Bank Accounts</span>
          </div>
        </div>
      </div>

      {/* No Accounts Warning */}
      {accounts.length === 0 && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '2px solid #ffc107',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '30px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>⚠️ No Bank Accounts Found</h3>
          <p style={{ margin: '0 0 15px', opacity: '0.9' }}>
            You need to add a bank account first to fund your wallet.
          </p>
          <button
            onClick={() => navigate('/accounts')}
            style={{
              background: '#ffc107',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            🏦 Add Bank Account
          </button>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          background: 'rgba(255, 99, 71, 0.1)',
          border: '2px solid #ff6347',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '20px',
          color: 'white'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(144, 238, 144, 0.1)',
          border: '2px solid #90ee90',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '20px',
          color: 'white'
        }}>
          {success}
        </div>
      )}

      {/* Add Money Modal */}
      {showAddMoney && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 25px', color: '#333', fontSize: '24px' }}>💰 Add Money to Wallet</h3>
            
            <form onSubmit={handleAddMoney}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontWeight: '500' }}>
                  Select Bank Account *
                </label>
                <select
                  value={addMoneyForm.account_id}
                  onChange={(e) => setAddMoneyForm(prev => ({ ...prev, account_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #e1e5e9',
                    fontSize: '16px',
                    backgroundColor: 'white'
                  }}
                  required
                >
                  <option value="">Choose account to transfer from...</option>
                  {accounts.map(account => (
                    <option key={account.account_id} value={account.account_id}>
                      {account.bank_name} - {currency(account.balance)} 
                      (***{account.account_number?.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontWeight: '500' }}>
                  Amount *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={addMoneyForm.amount}
                  onChange={(e) => setAddMoneyForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount to add"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #e1e5e9',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontWeight: '500' }}>
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={addMoneyForm.note}
                  onChange={(e) => setAddMoneyForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Add a note for this transaction"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid #e1e5e9',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMoney(false)}
                  style={{
                    background: '#f8f9fa',
                    color: '#666',
                    border: '2px solid #e9ecef',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {submitting ? 'Adding...' : '💰 Add Money'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 25px', color: '#333', fontSize: '24px', fontWeight: '600' }}>
          📊 Recent Transactions
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#4a5568' }}>
                <th style={{ padding: '12px 8px' }}>Type</th>
                <th style={{ padding: '12px 8px' }}>Amount</th>
                <th style={{ padding: '12px 8px' }}>Note</th>
                <th style={{ padding: '12px 8px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((transaction) => (
                <tr key={transaction.ledger_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {getTransactionTypeIcon(transaction.entry_type)}
                      </span>
                      <span style={{ textTransform: 'capitalize' }}>
                        {transaction.entry_type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 8px', 
                    color: '#2b6cb0', 
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    {currency(transaction.amount)}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#4a5568' }}>
                    {transaction.note || '-'}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#718096', fontSize: '14px' }}>
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ 
                    padding: '40px 20px', 
                    textAlign: 'center', 
                    color: '#a0aec0',
                    fontSize: '16px'
                  }}>
                    💸 No transactions yet
                    <br />
                    <small>Start by adding money from your bank account</small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;