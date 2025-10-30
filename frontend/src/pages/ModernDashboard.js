import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrpc } from '../trpc/TrpcProvider.jsx';

const ModernDashboard = () => {
  const navigate = useNavigate();
  const trpc = useTrpc();
  const [user, setUser] = useState({});
  const [balances, setBalances] = useState({});
  const [bills, setBills] = useState({ bills: [], statistics: {}, upcoming_bills: [] });
  const [accounts, setAccounts] = useState({ accounts: [], statistics: {} });
  const [transactions, setTransactions] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
    
    // Listen for account balance changes from other pages
    const handleBalanceChange = () => {
      console.log('Account balance changed, refreshing dashboard...');
      loadDashboardData();
    };
    
    window.addEventListener('accountBalanceChanged', handleBalanceChange);
    
    return () => {
      window.removeEventListener('accountBalanceChanged', handleBalanceChange);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        balancesRes,
        billsRes,
        accountsRes,
        transactionsRes,
        recentTransactionsRes,
        analyticsRes
      ] = await Promise.all([
        trpc.wallet.getBalances.query(),
        trpc.bill.list.query(),
        trpc.account.list.query(),
        trpc.wallet.getLedger.query(),
        // Fetch recent transactions from the new transaction history API
        trpc.transactionHistory.getRecent.query({ limit: 5 }).catch(() => []),
        Promise.resolve({ total_balance: 0, monthly_spending: 0, total_transactions: 0 }) // Mock analytics for now
      ]);

      setBalances(balancesRes);
      // Process bills to identify upcoming bills
      const allBills = billsRes?.bills || [];
      const upcomingBills = allBills
        .filter(bill => bill.status === 'Pending' || bill.computed_status === 'Pending')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5); // Get top 5 upcoming bills
      
      setBills({ 
        bills: allBills, 
        statistics: billsRes?.statistics || {
          total_bills: 0,
          pending_bills: 0,
          paid_bills: 0,
          overdue_bills: 0,
          pending_amount: 0,
          paid_amount: 0,
          average_bill_amount: 0
        }, 
        upcoming_bills: upcomingBills 
      });
      setAccounts({ accounts: accountsRes || [], statistics: {} });
      setTransactions(transactionsRes || []);
      setRecentTransactions(recentTransactionsRes || []);
      setAnalytics(analyticsRes);
      
      // Set user info from localStorage or default
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({ name: storedUser.name || storedUser.full_name || 'User' });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const currency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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
          <p style={{ color: '#666', fontSize: '18px', margin: 0 }}>Loading your dashboard...</p>
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
            {getGreeting()}, {user.name || 'User'}! 👋
          </h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '16px' }}>
            Welcome back to your financial dashboard
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={handleLogout}
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
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            🚪 Logout
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
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Wallet Balance</h3>
          <p style={{ margin: '0 0 15px', fontSize: '32px', fontWeight: '700' }}>
            {currency(balances.wallet_balance)}
          </p>
          <div style={{ fontSize: '14px', opacity: '0.9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📈 Net Flow: {currency(balances.transaction_stats?.net_flow)}</span>
            <button
              onClick={() => navigate('/wallet')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              💰 Add Funds
            </button>
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
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Account Balance</h3>
          <p style={{ margin: '0 0 15px', fontSize: '32px', fontWeight: '700' }}>
            {currency(balances.total_account_balance || balances.account_balance)}
          </p>
          <div style={{ fontSize: '14px', opacity: '0.9' }}>
            <span>🏦 Total Accounts: {accounts.accounts?.length || 0}</span>
          </div>
        </div>

        {/* Total Bills */}
        <div style={{
          background: 'linear-gradient(135deg, #A8E6CF 0%, #88D8C0 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 15px 35px rgba(168, 230, 207, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            fontSize: '100px',
            opacity: '0.1'
          }}>📄</div>
          <h3 style={{ margin: '0 0 10px', fontSize: '16px', opacity: '0.9' }}>Pending Bills</h3>
          <p style={{ margin: '0 0 15px', fontSize: '32px', fontWeight: '700' }}>
            {currency(bills.statistics.pending_amount)}
          </p>
          <div style={{ fontSize: '14px', opacity: '0.9' }}>
            <span>📋 {bills.statistics.pending_bills || 0} Bills</span>
          </div>
        </div>


      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 25px', color: '#333', fontSize: '24px', fontWeight: '600' }}>
          🚀 Quick Actions
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {[
            { icon: '💸', label: 'Send Money', path: '/transfer', color: '#FF6B6B' },
            { icon: '💰', label: 'Add to Wallet', path: '/wallet', color: '#4ECDC4' },
            { icon: '📄', label: 'Pay Bills', path: '/bills', color: '#A8E6CF' },
            { icon: '🏦', label: 'Manage Accounts', path: '/accounts', color: '#FFD93D' },
            { icon: '📈', label: 'Transaction History', path: '/transactions', color: '#667eea' }
          ].map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              style={{
                background: 'white',
                border: `2px solid ${action.color}`,
                borderRadius: '15px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '16px',
                fontWeight: '500',
                color: action.color
              }}
              onMouseEnter={(e) => {
                e.target.style.background = action.color;
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = `0 10px 25px rgba(0,0,0,0.1)`;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.color = action.color;
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{action.icon}</div>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '30px'
      }}>
        {/* Upcoming Bills */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px', color: '#333', fontSize: '20px', fontWeight: '600' }}>
            📅 Upcoming Bills
          </h3>
          {bills.upcoming_bills && bills.upcoming_bills.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {bills.upcoming_bills.map((bill, index) => (
                <div key={index} style={{
                  padding: '15px',
                  background: 'linear-gradient(135deg, #FF6B6B10, #FF8E5320)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  border: '1px solid #FF6B6B30'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 5px', fontWeight: '600', color: '#333' }}>
                        {bill.provider_name}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                        {bill.bill_type} • Due in {bill.days_until_due} days
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 5px', fontWeight: '700', color: '#FF6B6B' }}>
                        {currency(bill.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
              <p>No upcoming bills</p>
            </div>
          )}
          <button
            onClick={() => navigate('/bills')}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              marginTop: '15px',
              transition: 'all 0.3s ease'
            }}
          >
            Manage All Bills
          </button>
        </div>

        {/* Recent Transactions */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 20px', color: '#333', fontSize: '20px', fontWeight: '600' }}>
            💳 Recent Transactions
          </h3>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {recentTransactions.map((txn, index) => {
                const isIncoming = txn.transaction_type === 'WALLET_FUND' || txn.transaction_type === 'ACCOUNT_DEPOSIT' || 
                  (txn.transaction_type === 'WALLET_TRANSFER' && txn.destination_type === 'WALLET');
                const isOutgoing = txn.transaction_type.includes('PAYMENT') || txn.transaction_type.includes('WITHDRAWAL') ||
                  (txn.transaction_type === 'WALLET_TRANSFER' && txn.source_type === 'WALLET');
                
                return (
                  <div key={index} style={{
                    padding: '15px',
                    background: isIncoming
                      ? 'linear-gradient(135deg, #4ECDC410, #44A08D20)'
                      : 'linear-gradient(135deg, #FFD93D10, #FF870020)',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    border: isIncoming
                      ? '1px solid #4ECDC430'
                      : '1px solid #FFD93D30'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: '0 0 5px', fontWeight: '600', color: '#333' }}>
                          {txn.description || txn.transaction_type.replace(/_/g, ' ')}
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                          {txn.source_name} → {txn.destination_name} • {new Date(txn.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ 
                          margin: '0 0 5px', 
                          fontWeight: '700', 
                          color: isIncoming ? '#4ECDC4' : '#FF8700'
                        }}>
                          {isIncoming ? '+' : '-'}{currency(txn.amount)}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                          {txn.status || 'SUCCESS'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>💳</div>
              <p>No recent transactions</p>
            </div>
          )}
          <button
            onClick={() => navigate('/transactions')}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              marginTop: '15px',
              transition: 'all 0.3s ease'
            }}
          >
            View All Transactions
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#FF6B6B',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(255, 107, 107, 0.3)',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernDashboard;