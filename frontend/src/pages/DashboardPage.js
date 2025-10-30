import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrpc } from '../trpc/TrpcProvider.jsx';

const DashboardPage = () => {
  const trpc = useTrpc();
  const navigate = useNavigate();
  const [balances, setBalances] = useState({ wallet_balance: 0, account_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('wallet');
  const [direction, setDirection] = useState('account_to_wallet');
  const [note, setNote] = useState('');
  const [ledger, setLedger] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const fetchBalances = async () => {
    try {
      const [bRes, lRes] = await Promise.all([
        trpc.wallet.getBalances.query(),
        trpc.wallet.getLedger.query(),
      ]);
      setBalances(bRes);
      setLedger(lRes);
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const currency = (n) => Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const handleCheckWallet = async () => {
    await fetchBalances();
    alert(`Wallet Balance: ${currency(balances.wallet_balance)}`);
  };

  const handleCheckAccount = async () => {
    await fetchBalances();
    alert(`Account Balance: ${currency(balances.account_balance)}`);
  };

  const submitAddFunds = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    try {
      const res = await trpc.wallet.addFunds.mutate({ source, amount: Number(amount), note });
      setBalances(res.balances);
      setNote('');
      setAmount('');
      fetchBalances();
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to add funds');
    } finally {
      setSubmitting(false);
    }
  };

  const submitMove = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    try {
      const res = await trpc.wallet.moveFunds.mutate({ direction, amount: Number(amount), note });
      setBalances(res.balances);
      setNote('');
      setAmount('');
      fetchBalances();
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to move funds');
    } finally {
      setSubmitting(false);
    }
  };

  const tileStyle = {
    background: '#1b1e26',
    color: '#e2e8f0',
    border: '1px solid #252a35',
    borderRadius: 18,
    padding: '18px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 10,
    fontSize: 16
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f13',
      padding: '18px 18px 28px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 22, margin: 0 }}>Dashboard</h1>
        <button onClick={handleLogout} className="login-button" style={{ marginLeft: 12, width: 'auto', padding: '10px 16px' }}>Logout</button>
      </div>

      {/* Quick tiles: Pay, Bank transfer, Mobile recharge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        <button onClick={() => navigate('/add-payment')} style={tileStyle}>💸<span>Pay</span></button>
        <button onClick={() => navigate('/transfer')} style={tileStyle}>🏦<span>Bank transfer</span></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
        <button onClick={handleCheckWallet} className="login-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Check Wallet Balance
        </button>
        <button onClick={handleCheckAccount} className="login-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Check Account Balance
        </button>
      </div>

      {error && (
        <div className="message error" style={{ maxWidth: 840, marginBottom: 16 }}>{error}</div>
      )}

      <h2 style={{ color: '#e2e8f0', margin: '10px 0 15px' }}>Quick Actions</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24
      }}>
        <button onClick={() => navigate('/history')} className="login-button" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>📊 Transaction History</button>
        <button onClick={() => navigate('/add-account')} className="login-button" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>💳 Add Account Details</button>
      </div>

      {/* Bill Payments Section */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <h3 style={{ color: '#2d3748', marginTop: 0 }}>Bill Payments</h3>
        <p style={{ color: '#718096', marginTop: 6 }}>Pay your regular bills quickly.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Electricity', icon: '⚡' },
            { label: 'Mobile', icon: '📲' },
            { label: 'DTH', icon: '📡' },
            { label: 'Water', icon: '💧' },
            { label: 'Gas', icon: '🔥' },
            { label: 'Broadband', icon: '🌐' }
          ].map(item => (
            <button key={item.label} onClick={() => navigate('/add-payment', { state: { category: item.label } })} style={{
              background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#2d3748'
            }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginTop: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}>
        <h3 style={{ color: '#2d3748', marginTop: 0, marginBottom: 15 }}>Recent Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#4a5568' }}>
                <th style={{ padding: '10px 8px' }}>Date</th>
                <th style={{ padding: '10px 8px' }}>Type</th>
                <th style={{ padding: '10px 8px' }}>Amount</th>
                <th style={{ padding: '10px 8px' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 5).map((row) => (
                <tr key={row.ledger_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 8px', color: '#718096' }}>{new Date(row.created_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>{row.entry_type.replaceAll('_',' ')}</td>
                  <td style={{ padding: '10px 8px', color: '#2b6cb0', fontWeight: 600 }}>{currency(row.amount)}</td>
                  <td style={{ padding: '10px 8px', color: '#4a5568' }}>{row.note || '-'}</td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: 12, color: '#a0aec0' }}>No transactions yet</td>
                </tr>
              )}
            </tbody>
          </table>
          {ledger.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: 15 }}>
              <button onClick={() => navigate('/history')} style={{ 
                background: 'transparent', 
                border: 'none', 
                color: '#4299e1', 
                cursor: 'pointer',
                fontWeight: 500
              }}>
                View all transactions →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;