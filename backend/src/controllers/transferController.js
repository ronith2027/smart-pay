const db = require('../config/db');
const crypto = require('crypto');
const {
  logWalletTransfer,
  logWalletTransferReceived,
  logTransaction
} = require('../utils/transactionLogger');

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getDisplayName = (user) => user?.full_name || user?.username || user?.email;

const getPrimaryAccount = async (connection, userId) => {
  const [accounts] = await connection.query(
    'SELECT account_id, bank_name, balance FROM accounts WHERE user_id = ? ORDER BY is_primary DESC, account_id ASC LIMIT 1 FOR UPDATE',
    [userId]
  );
  return accounts.length > 0 ? accounts[0] : null;
};

const updateWalletBalance = async (connection, userId, delta) => {
  await connection.query(
    'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE user_id = ?',
    [delta, userId]
  );
  try {
    await connection.query(
      'UPDATE wallets SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
      [delta, userId]
    );
  } catch (walletError) {
    console.warn('Wallets table update skipped:', walletError.message);
  }
};

const updateAccountBalance = async (connection, userId, accountId, delta) => {
  if (accountId) {
    await connection.query(
      'UPDATE accounts SET balance = balance + ? WHERE account_id = ?',
      [delta, accountId]
    );
  }
  await connection.query(
    'UPDATE users SET account_balance = COALESCE(account_balance, 0) + ? WHERE user_id = ?',
    [delta, userId]
  );
};

const generateTransferReference = () => {
  return 'TRF' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

const executeTransfer = async ({ fromUserId, toUserId, amount, source, note, isSelfTransfer = false, fromAccountId, toAccountId }) => {
  if (!fromUserId || !toUserId) {
    throw createError('Sender and recipient are required');
  }

  if (fromUserId === toUserId && !isSelfTransfer) {
    throw createError('Cannot transfer money to yourself. Use self transfer for moving money between your accounts.');
  }

  if (!['wallet', 'account'].includes(source)) {
    throw createError('Source must be either "wallet" or "account"');
  }
  
  // For self transfers, we need both account IDs
  if (isSelfTransfer && (!fromAccountId || !toAccountId)) {
    throw createError('Source and destination account IDs are required for self transfers');
  }

  if (amount <= 0) {
    throw createError('Amount must be greater than 0');
  }

  const sanitizedNote = note && note.trim().length > 0 ? note.trim() : null;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [senderRows] = await connection.query(
      'SELECT user_id, username, full_name, email, wallet_balance, account_balance FROM users WHERE user_id = ? FOR UPDATE',
      [fromUserId]
    );
    if (senderRows.length === 0) {
      throw createError('Sender not found', 404);
    }

    const [recipientRows] = await connection.query(
      'SELECT user_id, username, full_name, email, wallet_balance, account_balance FROM users WHERE user_id = ? FOR UPDATE',
      [toUserId]
    );
    if (recipientRows.length === 0) {
      throw createError('Recipient not found', 404);
    }

    const sender = senderRows[0];
    const recipient = recipientRows[0];

    const senderName = getDisplayName(sender);
    const recipientName = getDisplayName(recipient);

    let senderBalanceBefore = 0;
    let senderBalanceAfter = 0;
    let senderAccount = null;

    if (source === 'wallet') {
      senderBalanceBefore = parseFloat(sender.wallet_balance ?? 0);
      if (senderBalanceBefore < amount) {
        throw createError(`Insufficient wallet balance. Available: ₹${senderBalanceBefore}`);
      }
      await updateWalletBalance(connection, fromUserId, -amount);
      senderBalanceAfter = senderBalanceBefore - amount;
    } else {
      // For self transfers, use the specified source account
      if (isSelfTransfer && fromAccountId) {
        const [accounts] = await connection.query(
          'SELECT account_id, bank_name, balance FROM accounts WHERE account_id = ? AND user_id = ? FOR UPDATE',
          [fromAccountId, fromUserId]
        );
        if (accounts.length === 0) {
          throw createError('Source account not found or does not belong to you');
        }
        senderAccount = accounts[0];
      } else {
        senderAccount = await getPrimaryAccount(connection, fromUserId);
      }
      
      if (!senderAccount) {
        throw createError('Sender does not have a linked bank account');
      }
      senderBalanceBefore = parseFloat(senderAccount.balance ?? 0);
      if (senderBalanceBefore < amount) {
        throw createError(`Insufficient account balance. Available: ₹${senderBalanceBefore}`);
      }
      await updateAccountBalance(connection, fromUserId, senderAccount.account_id, -amount);
      senderBalanceAfter = senderBalanceBefore - amount;
    }

    let recipientAccount = null;
    const recipientWalletBalanceBefore = parseFloat(recipient.wallet_balance ?? 0);

    let destinationType = 'wallet';
    let recipientBalanceBefore = recipientWalletBalanceBefore;
    let recipientBalanceAfter = recipientWalletBalanceBefore + amount;
    let destinationDetails = { type: 'wallet' };

    // For self transfers, use the specified destination account
    if (isSelfTransfer && toAccountId) {
      const [accounts] = await connection.query(
        'SELECT account_id, bank_name, balance FROM accounts WHERE account_id = ? AND user_id = ? FOR UPDATE',
        [toAccountId, toUserId]
      );
      if (accounts.length === 0) {
        throw createError('Destination account not found or does not belong to you');
      }
      recipientAccount = accounts[0];
      destinationType = 'account';
      recipientBalanceBefore = parseFloat(recipientAccount.balance ?? 0);
      recipientBalanceAfter = recipientBalanceBefore + amount;
      await updateAccountBalance(connection, toUserId, recipientAccount.account_id, amount);
      destinationDetails = {
        type: 'account',
        account_id: recipientAccount.account_id,
        bank_name: recipientAccount.bank_name
      };
    } else if (!isSelfTransfer) {
      // Regular transfer to another user
      recipientAccount = await getPrimaryAccount(connection, toUserId);
      if (recipientAccount) {
        destinationType = 'account';
        recipientBalanceBefore = parseFloat(recipientAccount.balance ?? 0);
        recipientBalanceAfter = recipientBalanceBefore + amount;
        await updateAccountBalance(connection, toUserId, recipientAccount.account_id, amount);
        destinationDetails = {
          type: 'account',
          account_id: recipientAccount.account_id,
          bank_name: recipientAccount.bank_name
        };
      } else {
        await updateWalletBalance(connection, toUserId, amount);
      }
    } else {
      // Self transfer to wallet (fallback)
      await updateWalletBalance(connection, toUserId, amount);
    }

    const transferReference = generateTransferReference();
    let transferId = null;

    try {
      const [transferInsert] = await connection.query(
        'INSERT INTO transfers (from_user_id, to_user_id, amount, note, created_at) VALUES (?, ?, ?, ?, NOW())',
        [fromUserId, toUserId, amount, sanitizedNote]
      );
      transferId = transferInsert.insertId;
    } catch (transferError) {
      console.warn('Could not insert into transfers table:', transferError.message);
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS transfers (
            transfer_id INT AUTO_INCREMENT PRIMARY KEY,
            from_user_id INT NOT NULL,
            to_user_id INT NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            note VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_user_id) REFERENCES users(user_id),
            FOREIGN KEY (to_user_id) REFERENCES users(user_id)
          )
        `);
        const [transferInsertRetry] = await connection.query(
          'INSERT INTO transfers (from_user_id, to_user_id, amount, note, created_at) VALUES (?, ?, ?, ?, NOW())',
          [fromUserId, toUserId, amount, sanitizedNote]
        );
        transferId = transferInsertRetry.insertId;
      } catch (retryError) {
        console.error('Failed to create or insert into transfers table:', retryError);
      }
    }

    const paymentMethod = source === 'wallet' ? 'Wallet' : 'Bank Transfer';
    const senderFromAccount = source === 'wallet' ? 'Wallet' : (senderAccount?.bank_name || 'Bank Account');
    const senderToAccount = destinationType === 'account' ? (destinationDetails.bank_name || 'Recipient Account') : 'Wallet';
    const recipientFromAccount = source === 'account' ? (senderAccount?.bank_name || 'Sender Account') : 'Wallet';
    const recipientToAccount = destinationType === 'account' ? (destinationDetails.bank_name || 'Bank Account') : 'Wallet';

    try {
      // Customize description for self transfers
      let senderDescription, recipientDescription;
      
      if (isSelfTransfer) {
        const fromAccountName = senderAccount?.bank_name || 'Primary Account';
        const toAccountName = recipientAccount?.bank_name || 'Wallet';
        senderDescription = `Self Transfer: ₹${amount} from ${fromAccountName} to ${toAccountName}${sanitizedNote ? ': ' + sanitizedNote : ''}`;
        recipientDescription = senderDescription; // Same description for self transfers
      } else {
        senderDescription = `Sent ₹${amount} to ${recipientName}${sanitizedNote ? ': ' + sanitizedNote : ''}`;
        recipientDescription = `Received ₹${amount} from ${senderName}${sanitizedNote ? ': ' + sanitizedNote : ''}`;
      }

      await connection.query(`
        INSERT INTO transactions (
          user_id, transaction_type, amount, payment_method,
          status, transaction_date, description, reference_number,
          from_account, to_account
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
      `, [
        fromUserId,
        isSelfTransfer ? 'Self Transfer' : 'Transfer',
        amount,
        paymentMethod,
        'Success',
        senderDescription,
        transferReference,
        senderFromAccount,
        senderToAccount
      ]);

      // For self transfers, we only need one transaction record since it's the same user
      if (!isSelfTransfer) {
        await connection.query(`
          INSERT INTO transactions (
            user_id, transaction_type, amount, payment_method,
            status, transaction_date, description, reference_number,
            from_account, to_account
          ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
        `, [
          toUserId,
          'Transfer',
          amount,
          paymentMethod,
          'Success',
          recipientDescription,
          transferReference,
          recipientFromAccount,
          recipientToAccount
        ]);
      }
    } catch (transactionError) {
      console.warn('Could not record in transactions table:', transactionError.message);
    }

    try {
      if (isSelfTransfer) {
        // Log self transfer
        const fromAccountName = senderAccount?.bank_name || 'Primary Account';
        const toAccountName = recipientAccount?.bank_name || 'Wallet';
        
        await logTransaction({
          user_id: fromUserId,
          transaction_type: 'SELF_TRANSFER',
          amount,
          source_type: 'BANK_ACCOUNT',
          source_id: senderAccount?.account_id || null,
          source_name: fromAccountName,
          destination_type: 'BANK_ACCOUNT',
          destination_id: recipientAccount?.account_id || null,
          destination_name: toAccountName,
          description: `Self Transfer: ₹${amount} from ${fromAccountName} to ${toAccountName}${sanitizedNote ? ': ' + sanitizedNote : ''}`,
          transfer_id: transferId,
          balance_before: senderBalanceBefore,
          balance_after: senderBalanceAfter
        });
      } else {
        // Regular transfer between users
        if (source === 'wallet') {
          await logWalletTransfer(
            fromUserId,
            amount,
            recipientName,
            toUserId,
            transferId,
            senderBalanceBefore,
            senderBalanceAfter
          );
        } else {
          await logTransaction({
            user_id: fromUserId,
            transaction_type: 'ACCOUNT_TRANSFER',
            amount,
            source_type: 'BANK_ACCOUNT',
            source_id: senderAccount?.account_id || null,
            source_name: senderAccount?.bank_name || 'Primary Account',
            destination_type: destinationType === 'account' ? 'BANK_ACCOUNT' : 'USER',
            destination_id: destinationType === 'account' ? destinationDetails.account_id : toUserId,
            destination_name: destinationType === 'account' ? (destinationDetails.bank_name || recipientName) : recipientName,
            description: `Sent ₹${amount} to ${recipientName}${sanitizedNote ? ': ' + sanitizedNote : ''}`,
            transfer_id: transferId,
            balance_before: senderBalanceBefore,
            balance_after: senderBalanceAfter
          });
        }

        if (destinationType === 'account') {
          await logTransaction({
            user_id: toUserId,
            transaction_type: 'ACCOUNT_TRANSFER',
            amount,
            source_type: source === 'account' ? 'BANK_ACCOUNT' : 'WALLET',
            source_id: source === 'account' ? (senderAccount?.account_id || null) : fromUserId,
            source_name: source === 'account' ? (senderAccount?.bank_name || senderName) : senderName,
            destination_type: 'BANK_ACCOUNT',
            destination_id: destinationDetails.account_id,
            destination_name: destinationDetails.bank_name,
            description: `Received ₹${amount} from ${senderName}${sanitizedNote ? ': ' + sanitizedNote : ''}`,
            transfer_id: transferId,
            balance_before: recipientBalanceBefore,
            balance_after: recipientBalanceAfter
          });
        } else {
          await logWalletTransferReceived(
            toUserId,
            amount,
            senderName,
            fromUserId,
            transferId,
            recipientBalanceBefore,
            recipientBalanceAfter
          );
        }
      }
    } catch (logError) {
      console.error('Error logging transfer transactions:', logError);
    }

    const [updatedSenderRows] = await connection.query(
      'SELECT COALESCE(wallet_balance, 0) as wallet_balance, COALESCE(account_balance, 0) as account_balance FROM users WHERE user_id = ?',
      [fromUserId]
    );
    const [updatedRecipientRows] = await connection.query(
      'SELECT COALESCE(wallet_balance, 0) as wallet_balance, COALESCE(account_balance, 0) as account_balance FROM users WHERE user_id = ?',
      [toUserId]
    );

    await connection.commit();

    return {
      transfer_reference: transferReference,
      transfer_id: transferId,
      amount: parseFloat(amount),
      source,
      note: sanitizedNote || '',
      destination_type: destinationType,
      transfer_date: new Date().toISOString(),
      sender: {
        user_id: sender.user_id,
        name: senderName,
        email: sender.email
      },
      recipient: {
        user_id: recipient.user_id,
        name: recipientName,
        email: recipient.email
      },
      destination_details: destinationDetails,
      updated_balances: {
        sender: {
          wallet_balance: parseFloat(updatedSenderRows[0].wallet_balance || 0),
          account_balance: parseFloat(updatedSenderRows[0].account_balance || 0)
        },
        recipient: {
          wallet_balance: parseFloat(updatedRecipientRows[0].wallet_balance || 0),
          account_balance: parseFloat(updatedRecipientRows[0].account_balance || 0)
        }
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.executeTransfer = executeTransfer;

// Find user by phone number or email
exports.findUser = async (req, res) => {
  const { identifier } = req.query; // Can be phone number or email
  const currentUserId = req.user.id;

  if (!identifier) {
    return res.status(400).json({ message: 'Phone number or email is required' });
  }

  try {
    // Search for user by email or by constructing phone from identifier
    const [users] = await db.query(
      'SELECT user_id, username, full_name, email FROM users WHERE (email = ? OR username = ?) AND user_id != ?',
      [identifier, identifier, currentUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        message: 'User not found with this identifier',
        found: false 
      });
    }

    const user = users[0];
    
    res.status(200).json({
      found: true,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Find user error:', error);
    res.status(500).json({ 
      message: 'Error searching for user', 
      error: error.message 
    });
  }
};

// Transfer money from one user to another
exports.transferMoney = async (req, res) => {
  const fromUserId = req.user.id;
  const { to_user_id, amount, source, note } = req.body;

  if (!to_user_id || !amount || !source) {
    return res.status(400).json({
      message: 'Recipient user ID, amount, and source (wallet/account) are required'
    });
  }

  try {
    const transferResult = await executeTransfer({
      fromUserId,
      toUserId: to_user_id,
      amount: parseFloat(amount),
      source,
      note
    });

    res.status(200).json({
      message: 'Transfer successful!',
      transfer: {
        transfer_reference: transferResult.transfer_reference,
        from_user: {
          name: transferResult.sender.name,
          email: transferResult.sender.email
        },
        to_user: {
          name: transferResult.recipient.name,
          email: transferResult.recipient.email
        },
        amount: transferResult.amount,
        source_type: transferResult.source,
        note: transferResult.note,
        status: 'Success',
        transfer_date: transferResult.transfer_date
      },
      destination_type: transferResult.destination_type,
      destination_details: transferResult.destination_details,
      updated_balances: transferResult.updated_balances
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      message: error.message || 'Error processing transfer'
    });
  }
};

// Get transfer history for a user
exports.getTransferHistory = async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
    // Check if transfers table exists, if not return empty result
    try {
      const [transfers] = await db.query(`
        SELECT 
          t.transfer_id,
          t.from_user_id,
          t.to_user_id,
          t.amount,
          t.note,
          t.created_at as transfer_date,
          sender.full_name as sender_name,
          sender.email as sender_email,
          recipient.full_name as recipient_name,
          recipient.email as recipient_email,
          CASE 
            WHEN t.from_user_id = ? THEN 'sent'
            ELSE 'received'
          END as transfer_type
        FROM transfers t
        LEFT JOIN users sender ON t.from_user_id = sender.user_id
        LEFT JOIN users recipient ON t.to_user_id = recipient.user_id
        WHERE t.from_user_id = ? OR t.to_user_id = ?
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, userId, parseInt(limit), parseInt(offset)]);

      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM transfers WHERE from_user_id = ? OR to_user_id = ?',
        [userId, userId]
      );

      res.status(200).json({
        transfers: transfers.map(transfer => ({
          ...transfer,
          amount: parseFloat(transfer.amount)
        })),
        pagination: {
          total: countResult[0].total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < countResult[0].total
        }
      });

    } catch (tableError) {
      // If table doesn't exist, return empty result
      res.status(200).json({
        transfers: [],
        pagination: {
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: false
        }
      });
    }

  } catch (error) {
    console.error('Get transfer history error:', error);
    res.status(500).json({ 
      message: 'Error fetching transfer history', 
      error: error.message 
    });
  }
};