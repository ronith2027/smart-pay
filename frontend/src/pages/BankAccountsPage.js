import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrpc } from '../trpc/TrpcProvider.jsx';

// Comprehensive list of Indian banks with IFSC patterns
const INDIAN_BANKS = [
  // Public Sector Banks
  { name: "State Bank of India", shortName: "SBI", code: "SBIN", ifscPrefix: "SBIN0" },
  { name: "Punjab National Bank", shortName: "PNB", code: "PUNB", ifscPrefix: "PUNB0" },
  { name: "Bank of Baroda", shortName: "BOB", code: "BARB", ifscPrefix: "BARB0" },
  { name: "Bank of India", shortName: "BOI", code: "BKID", ifscPrefix: "BKID0" },
  { name: "Central Bank of India", shortName: "CBI", code: "CBIN", ifscPrefix: "CBIN0" },
  { name: "Canara Bank", shortName: "Canara", code: "CNRB", ifscPrefix: "CNRB0" },
  { name: "Union Bank of India", shortName: "Union", code: "UBIN", ifscPrefix: "UBIN0" },
  { name: "Indian Bank", shortName: "Indian", code: "IDIB", ifscPrefix: "IDIB0" },
  { name: "Indian Overseas Bank", shortName: "IOB", code: "IOBA", ifscPrefix: "IOBA0" },
  { name: "Punjab & Sind Bank", shortName: "P&S Bank", code: "PSIB", ifscPrefix: "PSIB0" },
  { name: "UCO Bank", shortName: "UCO", code: "UCBA", ifscPrefix: "UCBA0" },
  
  // Private Sector Banks
  { name: "HDFC Bank", shortName: "HDFC", code: "HDFC", ifscPrefix: "HDFC0" },
  { name: "ICICI Bank", shortName: "ICICI", code: "ICIC", ifscPrefix: "ICIC0" },
  { name: "Axis Bank", shortName: "Axis", code: "UTIB", ifscPrefix: "UTIB0" },
  { name: "Kotak Mahindra Bank", shortName: "Kotak", code: "KKBK", ifscPrefix: "KKBK0" },
  { name: "IndusInd Bank", shortName: "IndusInd", code: "INDB", ifscPrefix: "INDB0" },
  { name: "Yes Bank", shortName: "YES", code: "YESB", ifscPrefix: "YESB0" },
  { name: "IDFC First Bank", shortName: "IDFC First", code: "IDFB", ifscPrefix: "IDFB0" },
  { name: "Federal Bank", shortName: "Federal", code: "FDRL", ifscPrefix: "FDRL0" },
  { name: "South Indian Bank", shortName: "SIB", code: "SIBL", ifscPrefix: "SIBL0" },
  { name: "Karnataka Bank", shortName: "KBL", code: "KARB", ifscPrefix: "KARB0" },
  { name: "City Union Bank", shortName: "CUB", code: "CIUB", ifscPrefix: "CIUB0" },
  { name: "Dhanlaxmi Bank", shortName: "Dhanlaxmi", code: "DLXB", ifscPrefix: "DLXB0" },
  { name: "IDBI Bank", shortName: "IDBI", code: "IBKL", ifscPrefix: "IBKL0" },
  { name: "Bandhan Bank", shortName: "Bandhan", code: "BDBL", ifscPrefix: "BDBL0" },
  
  // Regional Rural Banks & Others
  { name: "ESAF Small Finance Bank", shortName: "ESAF", code: "ESMF", ifscPrefix: "ESMF0" },
  { name: "Equitas Small Finance Bank", shortName: "Equitas", code: "ESFB", ifscPrefix: "ESFB0" },
  { name: "Jana Small Finance Bank", shortName: "Jana", code: "JSFB", ifscPrefix: "JSFB0" },
  { name: "AU Small Finance Bank", shortName: "AU SFB", code: "AUBL", ifscPrefix: "AUBL0" },
  { name: "Ujjivan Small Finance Bank", shortName: "Ujjivan", code: "UJVN", ifscPrefix: "UJVN0" },
  { name: "Suryoday Small Finance Bank", shortName: "Suryoday", code: "SURY", ifscPrefix: "SURY0" },
  
  // Co-operative Banks
  { name: "Saraswat Cooperative Bank", shortName: "Saraswat", code: "SRCB", ifscPrefix: "SRCB0" },
  { name: "Cosmos Cooperative Bank", shortName: "Cosmos", code: "COSB", ifscPrefix: "COSB0" },
  { name: "NKGSB Cooperative Bank", shortName: "NKGSB", code: "NKGS", ifscPrefix: "NKGS0" }
];

const ACCOUNT_TYPES = [
  { value: "Savings", label: "Savings Account" },
  { value: "Current", label: "Current Account" },
  { value: "Credit", label: "Credit Card" }
];

const BankAccountsPage = () => {
  const navigate = useNavigate();
  const trpc = useTrpc();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // Form state for adding new account
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_type: 'Savings',
    ifsc_code: '',
    account_holder_name: '',
    balance: ''
  });

  // Search state
  const [bankSearch, setBankSearch] = useState('');
  const [filteredBanks, setFilteredBanks] = useState(INDIAN_BANKS);
  
  // Add money form state
  const [addMoneyForm, setAddMoneyForm] = useState({
    amount: '',
    source: 'wallet',
    note: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    // Filter banks based on search
    const filtered = INDIAN_BANKS.filter(bank => 
      bank.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      bank.shortName.toLowerCase().includes(bankSearch.toLowerCase())
    );
    setFilteredBanks(filtered);
  }, [bankSearch]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const accounts = await trpc.account.list.query();
      setAccounts(accounts || []);
    } catch (err) {
      setError('Failed to load accounts');
      console.error('Accounts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelect = (bank) => {
    setFormData({
      ...formData,
      bank_name: bank.name,
      ifsc_code: bank.ifscPrefix + '000000' // Default pattern
    });
    setBankSearch(bank.name);
    setFilteredBanks(INDIAN_BANKS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    if (!formData.account_number || !formData.bank_name || !formData.ifsc_code) {
      setError('Please fill all required fields');
      return;
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code)) {
      setError('Please enter a valid IFSC code (format: ABCD0123456)');
      return;
    }

    try {
      await trpc.account.create.mutate({
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_type: formData.account_type,
        ifsc: formData.ifsc_code,
        holder_name: formData.account_holder_name,
        current_balance: parseFloat(formData.balance) || 0
      });
      
      setSuccess('Bank account added successfully!');
      setShowAddForm(false);
      setFormData({
        bank_name: '',
        account_number: '',
        account_type: 'Savings',
        ifsc_code: '',
        account_holder_name: '',
        balance: ''
      });
      setBankSearch('');
      fetchAccounts();
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('accountBalanceChanged'));
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to add account');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      const result = await trpc.account.delete.mutate({ account_id: accountId });
      setSuccess(result.message || 'Account deleted successfully!');
      fetchAccounts();
      
      // Trigger dashboard refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('accountBalanceChanged'));
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to delete account');
    }
  };

  const setPrimaryAccount = async (accountId) => {
    try {
      const result = await trpc.account.setPrimary.mutate({ account_id: accountId });
      setSuccess(result.message || 'Primary account updated successfully!');
      fetchAccounts();
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to set primary account');
    }
  };

  const handleAddMoney = (account) => {
    setSelectedAccount(account);
    setShowAddMoneyForm(true);
    setAddMoneyForm({ amount: '', source: 'wallet', note: '' });
  };

  const handleAddMoneySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addMoneyForm.amount || addMoneyForm.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const result = await trpc.account.addMoney.mutate({
        account_id: selectedAccount.account_id,
        amount: parseFloat(addMoneyForm.amount),
        source: addMoneyForm.source,
        note: addMoneyForm.note
      });
      
      setSuccess(result.message);
      setShowAddMoneyForm(false);
      setSelectedAccount(null);
      setAddMoneyForm({ amount: '', source: 'wallet', note: '' });
      fetchAccounts();
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('accountBalanceChanged'));
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Failed to add money');
    }
  };

  const currency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'Savings': return '🏦';
      case 'Current': return '💼';
      case 'Credit': return '💳';
      default: return '🏛️';
    }
  };
  
  // Self Transfer functionality
  const [showSelfTransferForm, setShowSelfTransferForm] = useState(false);
  const [selfTransferForm, setSelfTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    note: ''
  });
  const [selfTransferLoading, setSelfTransferLoading] = useState(false);
  
  const handleSelfTransferSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const { from_account_id, to_account_id, amount, note } = selfTransferForm;
    
    if (!from_account_id || !to_account_id) {
      setError('Please select both source and destination accounts');
      return;
    }
    
    if (from_account_id === to_account_id) {
      setError('Source and destination accounts cannot be the same');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    try {
      setSelfTransferLoading(true);
      const result = await trpc.transfer.selfTransfer.mutate({
        from_account_id: parseInt(from_account_id),
        to_account_id: parseInt(to_account_id),
        amount: parseFloat(amount),
        note
      });
      
      setSuccess('Self transfer completed successfully!');
      setShowSelfTransferForm(false);
      setSelfTransferForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        note: ''
      });
      fetchAccounts();
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('accountBalanceChanged'));
    } catch (err) {
      setError(err?.message || 'Failed to complete self transfer');
    } finally {
      setSelfTransferLoading(false);
    }
  };

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
            🏦 Manage Bank Accounts
          </h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '16px' }}>
            Add and manage your bank accounts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => {
              setShowAddForm(false);
              setShowSelfTransferForm(!showSelfTransferForm);
            }}
            style={{
              background: showSelfTransferForm ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              marginRight: '10px'
            }}
          >
            {showSelfTransferForm ? '❌ Cancel' : '↔️ Self Transfer'}
          </button>
          <button
            onClick={() => {
              setShowSelfTransferForm(false);
              setShowAddForm(!showAddForm);
            }}
            style={{
              background: showAddForm ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              marginRight: '10px'
            }}
          >
            {showAddForm ? '❌ Cancel' : '➕ Add Account'}
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

      {/* Messages */}
      {error && (
        <div style={{
          background: '#FF6B6B',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 10px 25px rgba(255, 107, 107, 0.3)'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#4ECDC4',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 10px 25px rgba(78, 205, 196, 0.3)'
        }}>
          {success}
        </div>
      )}

      {/* Self Transfer Form */}
      {showSelfTransferForm && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 25px', color: '#333', fontSize: '20px', fontWeight: '600' }}>
            ↔️ Transfer Between Your Accounts
          </h3>
          
          {accounts.length < 2 ? (
            <div style={{ 
              background: '#fff5f5', 
              color: '#e53e3e', 
              padding: '15px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #fed7d7'
            }}>
              You need at least two bank accounts to use this feature. Please add another account.
            </div>
          ) : (
            <form onSubmit={handleSelfTransferSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* From Account */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                    🏦 From Account *
                  </label>
                  <select
                    value={selfTransferForm.from_account_id}
                    onChange={(e) => setSelfTransferForm({...selfTransferForm, from_account_id: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      marginBottom: '10px'
                    }}
                  >
                    <option value="">Select source account</option>
                    {accounts.map(account => (
                      <option key={`from-${account.account_id}`} value={account.account_id}>
                        {account.bank_name} - ₹{account.balance} {account.is_primary ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* To Account */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                    🏦 To Account *
                  </label>
                  <select
                    value={selfTransferForm.to_account_id}
                    onChange={(e) => setSelfTransferForm({...selfTransferForm, to_account_id: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      marginBottom: '10px'
                    }}
                  >
                    <option value="">Select destination account</option>
                    {accounts.map(account => (
                      <option key={`to-${account.account_id}`} value={account.account_id}>
                        {account.bank_name} - ₹{account.balance} {account.is_primary ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Amount */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                    💰 Amount *
                  </label>
                  <input
                    type="number"
                    value={selfTransferForm.amount}
                    onChange={(e) => setSelfTransferForm({...selfTransferForm, amount: e.target.value})}
                    placeholder="Enter amount to transfer"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      marginBottom: '10px'
                    }}
                  />
                </div>
                
                {/* Note */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                    📝 Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={selfTransferForm.note}
                    onChange={(e) => setSelfTransferForm({...selfTransferForm, note: e.target.value})}
                    placeholder="Add a note for this transfer"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      marginBottom: '10px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <button
                  type="submit"
                  disabled={selfTransferLoading}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 25px',
                    borderRadius: '8px',
                    cursor: selfTransferLoading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    opacity: selfTransferLoading ? 0.7 : 1
                  }}
                >
                  {selfTransferLoading ? '⏳ Processing...' : '↔️ Transfer Money'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      
      {/* Add Account Form */}
      {showAddForm && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 25px', color: '#333', fontSize: '20px', fontWeight: '600' }}>
            ➕ Add New Bank Account
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Bank Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  🏦 Select Bank *
                </label>
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search for your bank..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginBottom: '10px'
                  }}
                />
                {bankSearch && (
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: 'white'
                  }}>
                    {filteredBanks.slice(0, 10).map((bank, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleBankSelect(bank)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: '1px solid #f7fafc',
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f7fafc'}
                        onMouseLeave={(e) => e.target.style.background = 'white'}
                      >
                        <strong>{bank.name}</strong> ({bank.shortName})
                        <br />
                        <small style={{ color: '#666' }}>IFSC starts with: {bank.ifscPrefix}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  🔢 Account Number *
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Enter your account number"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              {/* Account Type */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  📋 Account Type *
                </label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                >
                  {ACCOUNT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* IFSC Code */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  🏛️ IFSC Code *
                </label>
                <input
                  type="text"
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="ABCD0123456"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                  maxLength="11"
                  required
                />
                <small style={{ color: '#666' }}>Format: 4 letters + 0 + 6 digits</small>
              </div>

              {/* Account Holder Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  👤 Account Holder Name
                </label>
                <input
                  type="text"
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  placeholder="As per bank records"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Initial Balance */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  💰 Current Balance
                </label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: '25px',
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              ➕ Add Bank Account
            </button>
          </form>
        </div>
      )}

      {/* Add Money Form */}
      {showAddMoneyForm && selectedAccount && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 25px', color: '#333', fontSize: '20px', fontWeight: '600' }}>
            💰 Add Money to {selectedAccount.bank_name}
          </h3>
          <p style={{ margin: '0 0 25px', color: '#666', fontSize: '14px' }}>
            Current Balance: {currency(selectedAccount.balance)}
          </p>

          <form onSubmit={handleAddMoneySubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {/* Amount */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  💵 Amount *
                </label>
                <input
                  type="number"
                  value={addMoneyForm.amount}
                  onChange={(e) => setAddMoneyForm({ ...addMoneyForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              {/* Source */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  🏛️ Source *
                </label>
                <select
                  value={addMoneyForm.source}
                  onChange={(e) => setAddMoneyForm({ ...addMoneyForm, source: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="wallet">From Wallet</option>
                  <option value="external">External Source</option>
                </select>
              </div>

              {/* Note */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500' }}>
                  📝 Note (Optional)
                </label>
                <input
                  type="text"
                  value={addMoneyForm.note}
                  onChange={(e) => setAddMoneyForm({ ...addMoneyForm, note: e.target.value })}
                  placeholder="Add a note for this transaction"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
              <button
                type="submit"
                style={{
                  padding: '15px 30px',
                  background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                💰 Add Money
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowAddMoneyForm(false);
                  setSelectedAccount(null);
                  setAddMoneyForm({ amount: '', source: 'wallet', note: '' });
                }}
                style={{
                  padding: '15px 30px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 25px', color: '#333', fontSize: '20px', fontWeight: '600' }}>
          💳 Your Bank Accounts ({accounts.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
            <p>Loading your accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏦</div>
            <p>No bank accounts added yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                marginTop: '15px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Add Your First Account
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {accounts.map((account, index) => (
              <div
                key={index}
                style={{
                  background: account.is_primary 
                    ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)' 
                    : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  color: account.is_primary ? 'white' : '#333',
                  padding: '25px',
                  borderRadius: '15px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  position: 'relative',
                  border: account.is_primary ? '3px solid rgba(255,255,255,0.3)' : 'none'
                }}
              >
                {account.is_primary && (
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    background: 'rgba(255,255,255,0.2)',
                    padding: '6px 12px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    ⭐ PRIMARY
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{ fontSize: '24px', marginRight: '10px' }}>
                    {getAccountIcon(account.account_type)}
                  </span>
                  <div>
                    <h4 style={{ margin: '0 0 5px', fontSize: '16px', fontWeight: '600' }}>
                      {account.bank_name}
                    </h4>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      opacity: account.is_primary ? 0.9 : 0.7 
                    }}>
                      {account.account_type} Account
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <p style={{ 
                    margin: '0 0 5px', 
                    fontSize: '24px', 
                    fontWeight: '700' 
                  }}>
                    {currency(account.balance)}
                  </p>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '12px', 
                    opacity: account.is_primary ? 0.8 : 0.6,
                    fontFamily: 'monospace'
                  }}>
                    Account: •••••{account.account_number.slice(-4)}
                  </p>
                  <p style={{ 
                    margin: '5px 0 0', 
                    fontSize: '12px', 
                    opacity: account.is_primary ? 0.8 : 0.6,
                    fontFamily: 'monospace'
                  }}>
                    IFSC: {account.ifsc_code}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleAddMoney(account)}
                    style={{
                      padding: '8px 12px',
                      background: '#4ECDC4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    💰 Add Money
                  </button>
                  
                  {!account.is_primary && (
                    <button
                      onClick={() => setPrimaryAccount(account.account_id)}
                      style={{
                        padding: '8px 12px',
                        background: account.is_primary ? 'rgba(255,255,255,0.2)' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      ⭐ Set Primary
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteAccount(account.account_id)}
                    style={{
                      padding: '8px 12px',
                      background: '#FF6B6B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BankAccountsPage;