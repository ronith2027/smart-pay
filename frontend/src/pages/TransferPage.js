import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrpc } from '../trpc/TrpcProvider.jsx';

const TransferPage = () => {
  const navigate = useNavigate();
  const trpc = useTrpc();
  const [step, setStep] = useState(1); // 1: Find User, 2: Transfer Details, 3: Confirmation, 4: Success
  const [identifier, setIdentifier] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('wallet');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [note, setNote] = useState('');
  const [userBalances, setUserBalances] = useState({ wallet_balance: 0, account_balance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transferResult, setTransferResult] = useState(null);

  useEffect(() => {
    loadUserBalances();
    loadUserAccounts();
  }, []);

  const loadUserBalances = async () => {
    try {
      const balances = await trpc.wallet.getBalances.query();
      setUserBalances(balances);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };
  
  const loadUserAccounts = async () => {
    try {
      const accountsList = await trpc.account.list.query();
      setAccounts(accountsList);
      
      // If accounts exist, select the primary one or the first one by default
      if (accountsList.length > 0) {
        const primaryAccount = accountsList.find(acc => acc.is_primary) || accountsList[0];
        setSelectedAccount(primaryAccount);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const findUser = async () => {
    if (!identifier.trim()) {
      setError('Please enter email or username');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await trpc.transfer.findUser.query({ identifier });
      
      if (result.found) {
        setRecipient(result.user);
        setStep(2);
      } else {
        setError('User not found with this email/username');
      }
    } catch (error) {
      setError(error?.message || error?.response?.data?.message || 'Error finding user');
    } finally {
      setLoading(false);
    }
  };

  const validateTransfer = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (source === 'wallet') {
      const availableBalance = userBalances.wallet_balance;
      if (parseFloat(amount) > availableBalance) {
        setError(`Insufficient wallet balance. Available: ₹${availableBalance}`);
        return false;
      }
    } else if (source === 'account') {
      if (!selectedAccount) {
        setError('Please select a bank account');
        return false;
      }
      
      if (parseFloat(amount) > parseFloat(selectedAccount.balance)) {
        setError(`Insufficient account balance. Available: ₹${selectedAccount.balance}`);
        return false;
      }
    }

    return true;
  };

  const processTransfer = async () => {
    if (!validateTransfer()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const transferData = {
        to_user_id: recipient.user_id,
        amount: parseFloat(amount),
        source,
        note
      };
      
      // Add account_id if source is account
      if (source === 'account' && selectedAccount) {
        transferData.account_id = selectedAccount.account_id;
      }
      
      const result = await trpc.transfer.send.mutate(transferData);

      setTransferResult(result);
      setStep(4);
      
      // Reload balances and accounts
      await loadUserBalances();
      await loadUserAccounts();

    } catch (error) {
      setError(error?.message || error?.response?.data?.message || 'Error processing transfer');
    } finally {
      setLoading(false);
    }
  };

  const currency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const resetTransfer = () => {
    setStep(1);
    setIdentifier('');
    setRecipient(null);
    setAmount('');
    setSource('wallet');
    setNote('');
    setError('');
    setTransferResult(null);
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '600px',
    margin: '0 auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'transform 0.2s ease',
    marginRight: '10px'
  };

  const inputStyle = {
    width: '100%',
    padding: '15px',
    borderRadius: '10px',
    border: '2px solid #e1e5e9',
    fontSize: '16px',
    marginBottom: '15px',
    transition: 'border-color 0.3s ease'
  };

  if (step === 1) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '24px', 
                cursor: 'pointer', 
                marginRight: '15px' 
              }}
            >
              ←
            </button>
            <h1 style={{ margin: 0, color: '#333', fontSize: '28px' }}>💸 Send Money</h1>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>Your Balances:</h3>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', 
                color: 'white', 
                padding: '15px 20px', 
                borderRadius: '10px', 
                flex: 1 
              }}>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>Wallet</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{currency(userBalances.wallet_balance)}</div>
              </div>
              <div style={{ 
                background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)', 
                color: 'white', 
                padding: '15px 20px', 
                borderRadius: '10px', 
                flex: 1 
              }}>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>Account</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{currency(userBalances.account_balance)}</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
              Enter Email or Username
            </label>
            <input
              type="text"
              placeholder="e.g., john@example.com or john123"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>

          {error && (
            <div style={{ 
              background: '#fff5f5', 
              color: '#e53e3e', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #fed7d7'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={findUser}
            disabled={loading}
            style={buttonStyle}
            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            {loading ? '🔍 Searching...' : '🔍 Find User'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <button 
              onClick={() => setStep(1)}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '24px', 
                cursor: 'pointer', 
                marginRight: '15px' 
              }}
            >
              ←
            </button>
            <h1 style={{ margin: 0, color: '#333', fontSize: '28px' }}>💰 Transfer Details</h1>
          </div>

          <div style={{ 
            background: '#f7fafc', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '25px',
            border: '2px solid #e2e8f0'
          }}>
            <h3 style={{ margin: '0 0 10px', color: '#333' }}>Sending to:</h3>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#667eea' }}>{recipient?.full_name}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>{recipient?.email}</div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
              Amount
            </label>
            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
              Source
            </label>
            <div style={{ display: 'flex', gap: '15px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '15px 20px',
                borderRadius: '10px',
                border: source === 'wallet' ? '2px solid #667eea' : '2px solid #e1e5e9',
                background: source === 'wallet' ? '#f0f4ff' : 'white',
                cursor: 'pointer',
                flex: 1
              }}>
                <input
                  type="radio"
                  value="wallet"
                  checked={source === 'wallet'}
                  onChange={(e) => setSource(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <div style={{ fontWeight: '600' }}>💳 Wallet</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>{currency(userBalances.wallet_balance)}</div>
                </div>
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '15px 20px',
                borderRadius: '10px',
                border: source === 'account' ? '2px solid #667eea' : '2px solid #e1e5e9',
                background: source === 'account' ? '#f0f4ff' : 'white',
                cursor: 'pointer',
                flex: 1
              }}>
                <input
                  type="radio"
                  value="account"
                  checked={source === 'account'}
                  onChange={(e) => setSource(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <div style={{ fontWeight: '600' }}>🏦 Account</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {accounts.length > 0 
                      ? `${accounts.length} account${accounts.length > 1 ? 's' : ''} available` 
                      : 'No accounts'}
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          {/* Account selection dropdown when account is selected as source */}
          {source === 'account' && accounts.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                Select Account
              </label>
              <select
                value={selectedAccount?.account_id || ''}
                onChange={(e) => {
                  const selected = accounts.find(acc => acc.account_id === parseInt(e.target.value));
                  setSelectedAccount(selected || null);
                }}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 15px top 50%',
                  backgroundSize: '12px auto',
                  paddingRight: '40px'
                }}
              >
                {accounts.map(account => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.bank_name} - {account.account_number.slice(-4)} - {currency(account.balance)}
                    {account.is_primary ? ' (Primary)' : ''}
                  </option>
                ))}
              </select>
              
              {selectedAccount && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px 15px', 
                  backgroundColor: '#f0f4ff', 
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <div><strong>Bank:</strong> {selectedAccount.bank_name}</div>
                  <div><strong>Account:</strong> •••• {selectedAccount.account_number.slice(-4)}</div>
                  <div><strong>Balance:</strong> {currency(selectedAccount.balance)}</div>
                </div>
              )}
            </div>
          )}
          
          {source === 'account' && accounts.length === 0 && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#fff8e1',
              borderRadius: '8px',
              borderLeft: '4px solid #ffc107'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '5px' }}>No bank accounts found</div>
              <div style={{ fontSize: '14px' }}>
                Please add a bank account in your profile before making account transfers.
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
              Note (Optional)
            </label>
            <textarea
              placeholder="Add a note for this transfer"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
          </div>

          {error && (
            <div style={{ 
              background: '#fff5f5', 
              color: '#e53e3e', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #fed7d7'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep(3)}
              disabled={!amount || parseFloat(amount) <= 0}
              style={{
                ...buttonStyle,
                opacity: (!amount || parseFloat(amount) <= 0) ? 0.5 : 1
              }}
              onMouseEnter={(e) => (!amount || parseFloat(amount) <= 0) ? null : (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              📋 Review Transfer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
            <button 
              onClick={() => setStep(2)}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '24px', 
                cursor: 'pointer', 
                marginRight: '15px' 
              }}
            >
              ←
            </button>
            <h1 style={{ margin: 0, color: '#333', fontSize: '28px' }}>✅ Confirm Transfer</h1>
          </div>

          <div style={{ 
            background: '#f7fafc', 
            padding: '25px', 
            borderRadius: '12px', 
            marginBottom: '25px',
            border: '2px solid #e2e8f0'
          }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>To:</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>{recipient?.full_name}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>{recipient?.email}</div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Amount:</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#667eea' }}>{currency(parseFloat(amount))}</div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>From:</div>
              {source === 'wallet' ? (
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  💳 Wallet
                  <span style={{ fontWeight: 'normal', marginLeft: '10px' }}>
                    ({currency(userBalances.wallet_balance)} available)
                  </span>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                    🏦 {selectedAccount?.bank_name || 'Bank Account'}
                  </div>
                  {selectedAccount && (
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      Account: •••• {selectedAccount.account_number.slice(-4)} | 
                      Balance: {currency(selectedAccount.balance)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {note && (
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Note:</div>
                <div style={{ fontSize: '16px', color: '#333', fontStyle: 'italic' }}>{note}</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ 
              background: '#fff5f5', 
              color: '#e53e3e', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #fed7d7'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={processTransfer}
              disabled={loading}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                flex: 1
              }}
              onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {loading ? '💸 Processing...' : '💸 Send Money'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
            <h1 style={{ margin: 0, color: '#48bb78', fontSize: '28px' }}>Transfer Successful!</h1>
          </div>

          <div style={{ 
            background: '#f0fff4', 
            padding: '25px', 
            borderRadius: '12px', 
            marginBottom: '25px',
            border: '2px solid #9ae6b4'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#48bb78', marginBottom: '5px' }}>
                {currency(transferResult?.transfer.amount)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Transfer Reference: <span style={{ fontWeight: '600' }}>{transferResult?.transfer.transfer_reference}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>To:</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{transferResult?.transfer.to_user.name}</div>
              </div>
              <div style={{ fontSize: '24px' }}>→</div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>From:</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  {transferResult?.transfer.source_type === 'wallet' ? '💳 Wallet' : '🏦 Account'}
                </div>
              </div>
            </div>

            {transferResult?.transfer.note && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>Note:</div>
                <div style={{ fontSize: '16px', color: '#333', fontStyle: 'italic' }}>{transferResult.transfer.note}</div>
              </div>
            )}
          </div>

          <div style={{ 
            background: '#f7fafc', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '25px' 
          }}>
            <h3 style={{ margin: '0 0 15px', color: '#333' }}>Updated Balances:</h3>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: '#666' }}>💳 Wallet</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  {currency(transferResult?.updated_balances.sender.wallet_balance)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: '#666' }}>🏦 Account</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  {currency(transferResult?.updated_balances.sender.account_balance)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={resetTransfer}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                flex: 1
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              💸 Send Another
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #718096 0%, #4a5568 100%)',
                flex: 1
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🏠 Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TransferPage;