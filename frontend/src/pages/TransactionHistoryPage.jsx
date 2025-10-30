import React, { useState } from 'react';
import { useTrpc } from '../trpc/TrpcProvider';
import { useNavigate } from 'react-router-dom';
import './TransactionHistory.css';
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  CreditCard,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';

const TransactionHistoryPage = () => {
  const trpc = useTrpc();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    limit: 20,
    offset: 0,
    transaction_type: '',
    category: '',
    status: '',
    start_date: '',
    end_date: '',
    search: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch transaction history (No changes to logic)
  React.useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const data = await trpc.transactionHistory.getHistory.query(filters);
        setHistoryData(data);
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        setHistoryData({ transactions: [], pagination: { total: 0, has_more: false } });
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [filters, trpc]);
  
  // Helper functions (No changes to logic)
  const getTransactionIcon = (type) => {
    const iconMap = {
      'WALLET_FUND': { icon: ArrowDownLeft, color: 'text-green-600' },
      'WALLET_TRANSFER': { icon: ArrowUpRight, color: 'text-blue-600' },
      'BILL_PAYMENT_WALLET': { icon: Receipt, color: 'text-red-600' },
      'BILL_PAYMENT_BANK': { icon: Receipt, color: 'text-red-600' },
      'ACCOUNT_TRANSFER': { icon: CreditCard, color: 'text-purple-600' },
      'ACCOUNT_DEPOSIT': { icon: ArrowDownLeft, color: 'text-green-600' },
      'ACCOUNT_WITHDRAWAL': { icon: ArrowUpRight, color: 'text-orange-600' },
      'WALLET_TO_ACCOUNT': { icon: ArrowUpRight, color: 'text-indigo-600' },
      'ACCOUNT_TO_WALLET': { icon: ArrowDownLeft, color: 'text-indigo-600' }
    };
    return iconMap[type] || { icon: DollarSign, color: 'text-gray-600' };
  };

  const getTransactionTitle = (transaction) => {
    // This function remains the same
    const titles = {
      'WALLET_FUND': 'Wallet Funded',
      'WALLET_TRANSFER': transaction.destination_type === 'USER' ? 'Money Sent' : 'Money Received',
      'BILL_PAYMENT_WALLET': 'Bill Payment (Wallet)',
      'BILL_PAYMENT_BANK': 'Bill Payment (Bank)',
      'ACCOUNT_TRANSFER': 'Account Transfer',
      'ACCOUNT_DEPOSIT': 'Account Deposit',
      'ACCOUNT_WITHDRAWAL': 'Account Withdrawal',
      'WALLET_TO_ACCOUNT': 'Wallet to Account',
      'ACCOUNT_TO_WALLET': 'Account to Wallet'
    };
    return titles[transaction.transaction_type] || 'Transaction';
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handlePageChange = (direction) => {
    const newOffset = direction === 'next' 
      ? filters.offset + filters.limit 
      : Math.max(0, filters.offset - filters.limit);
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const clearFilters = () => {
    setFilters({
      limit: 20, offset: 0, transaction_type: '', category: '', status: '',
      start_date: '', end_date: '', search: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };
  
  if (historyLoading) {
    return <div>Loading...</div>;
  }

  const transactions = historyData?.transactions || [];
  const pagination = historyData?.pagination || { total: 0, has_more: false };

  return (
    <div className="page-container">
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">Recent Transactions</h1>
          <button 
            onClick={handleDashboardClick}
            className="dashboard-btn"
            title="Go to Dashboard"
          >
            <Home size={16} />
            <span>Dashboard</span>
          </button>
        </div>
      </header>
      
      <main className="main-card">
        <div className="controls-bar">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field search-input"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn">
            <Filter size={14} />
            <span>Filter</span>
          </button>
          {/* EXPORT AND TEST PDF BUTTONS HAVE BEEN REMOVED FROM HERE */}
        </div>
        
        {showFilters && (
          <div className="filter-controls">
            <div className="filter-group">
              <label>Type</label>
              <select 
                value={filters.transaction_type}
                onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                className="select-field"
              >
                <option value="">All Types</option>
                <option value="WALLET_FUND">Wallet Fund</option>
                <option value="WALLET_TRANSFER">Wallet Transfer</option>
                <option value="BILL_PAYMENT_WALLET">Bill Payment (Wallet)</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="select-field"
              >
                <option value="">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="input-field"
              />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="input-field"
              />
            </div>
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        )}
        
        {transactions.length === 0 ? (
          <div className="no-data-state">
            <Receipt className="no-data-icon" />
            <h3>No transactions found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const { icon: Icon, color } = getTransactionIcon(transaction.transaction_type);
                return (
                  <tr key={transaction.id} className="transaction-row">
                    <td>
                      <div className="transaction-type">
                        <div className="transaction-icon">
                          <Icon size={18} className={color}/>
                        </div>
                        <span>{getTransactionTitle(transaction)}</span>
                      </div>
                    </td>
                    <td className="transaction-amount">{formatCurrency(transaction.amount)}</td>
                    <td>{transaction.description || `Paid bill of ${formatCurrency(transaction.amount)}`}</td>
                    <td>
                      {new Date(transaction.transaction_date).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {transactions.length > 0 && pagination.total > filters.limit && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="pagination-controls">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={filters.offset === 0}
                className="btn"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                onClick={() => handlePageChange('next')}
                disabled={!pagination.has_more}
                className="btn"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TransactionHistoryPage;