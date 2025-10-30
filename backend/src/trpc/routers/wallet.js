const { initTRPC } = require('@trpc/server');
const { z } = require('zod');
const db = require('../../config/db');
const { 
  logWalletFund, 
  logWalletToAccount, 
  logAccountToWallet 
} = require('../../utils/transactionLogger');

const t = initTRPC.context().create();

const walletRouter = t.router({
  getWallets: t.procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error('Unauthorized');
    const userId = ctx.user.id;
    const [user] = await db.query(
      'SELECT wallet_balance, created_at FROM users WHERE user_id = ?',
      [userId]
    );
    
    // Ensure balance is never negative
    const balance = Math.max(0, Number(user[0]?.wallet_balance || 0));
    
    // If there was a negative balance, fix it in the database
    if (user[0]?.wallet_balance < 0) {
      await db.query(
        'UPDATE users SET wallet_balance = 0 WHERE user_id = ? AND wallet_balance < 0',
        [userId]
      );
      
      try {
        await db.query(
          'UPDATE wallets SET wallet_balance = 0 WHERE user_id = ? AND wallet_balance < 0',
          [userId]
        );
      } catch (e) {
        // Ignore if wallets table doesn't exist or has no negative balance
      }
    }
    
    return [{
      wallet_id: 1,
      balance: balance,
      wallet_name: 'My Wallet',
      currency: 'USD',
      created_at: user[0]?.created_at,
    }];
  }),

  addMoney: t.procedure
    .input(z.object({ wallet_id: z.number().int(), amount: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      const { amount } = input;
      const [wallet] = await db.query(
        'SELECT wallet_balance FROM users WHERE user_id = ?',
        [userId]
      );
      if (wallet.length === 0) {
        throw new Error('Wallet not found');
      }
      const oldBalance = Number(wallet[0].wallet_balance || 0);
      const newBalance = oldBalance + amount;
      await db.query(
        'UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
        [amount, userId]
      );
      return { balance_before: oldBalance, balance_after: newBalance };
    }),

  getBalances: t.procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error('Unauthorized');
    const userId = ctx.user.id;
    
    // Get wallet balance from users table (it has wallet_balance column)
    const [walletRows] = await db.query(
      'SELECT COALESCE(wallet_balance, 0) as wallet_balance, COALESCE(account_balance, 0) as account_balance FROM users WHERE user_id = ?',
      [userId]
    );
    
    // Fix negative wallet balance if it exists
    const walletBalance = Number(walletRows[0]?.wallet_balance || 0);
    if (walletBalance < 0) {
      // Update the database to set wallet balance to 0
      await db.query(
        'UPDATE users SET wallet_balance = 0 WHERE user_id = ? AND wallet_balance < 0',
        [userId]
      );
      
      try {
        await db.query(
          'UPDATE wallets SET wallet_balance = 0 WHERE user_id = ? AND wallet_balance < 0',
          [userId]
        );
      } catch (e) {
        // Ignore if wallets table doesn't exist or has no negative balance
      }
    }
    
    // Get sum of all account balances from accounts table
    const [accountSum] = await db.query(
      'SELECT COALESCE(SUM(balance), 0) as total_account_balance, COUNT(*) as account_count FROM accounts WHERE user_id = ?',
      [userId]
    );
    
    // Get transaction statistics
    const [statsRows] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'Success' AND amount > 0 THEN amount ELSE 0 END), 0) as total_inflow,
        COALESCE(SUM(CASE WHEN status = 'Success' AND amount > 0 THEN 1 ELSE 0 END), 0) as successful_count,
        COALESCE(COUNT(*), 0) as total_count
      FROM transactions 
      WHERE user_id = ?
    `, [userId]);
    
    const success_rate = statsRows[0]?.total_count > 0 
      ? (statsRows[0].successful_count / statsRows[0].total_count) * 100 
      : 0;
    const net_flow = Number(statsRows[0]?.total_inflow || 0);
    
    return {
      wallet_balance: Math.max(0, walletBalance), // Ensure non-negative balance
      account_balance: Number(accountSum[0]?.total_account_balance || 0), // Add account_balance for frontend compatibility
      total_account_balance: Number(accountSum[0]?.total_account_balance || 0),
      total_accounts: Number(accountSum[0]?.account_count || 0),
      transaction_stats: {
        net_flow,
        success_rate: Math.round(success_rate * 100) / 100,
        successful_transactions: statsRows[0]?.successful_count || 0
      }
    };
  }),

  getLedger: t.procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error('Unauthorized');
    const userId = ctx.user.id;
    try {
      const [rows] = await db.query(
        'SELECT ledger_id, entry_type, amount, note, created_at FROM wallet_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [userId]
      );
      return rows.map(row => ({
        ...row,
        amount: Number(row.amount || 0)
      }));
    } catch (error) {
      // If wallet_ledger table doesn't exist, return empty array
      return [];
    }
  }),

  addFunds: t.procedure
    .input(z.object({ source: z.string(), amount: z.number().positive(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      const { source, amount, note } = input;
      
      // Update balance based on source (only for wallet)
      if (source === 'wallet') {
        await db.query(
          'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE user_id = ?',
          [amount, userId]
        );
      }
      
      // Try to log in wallet_ledger if it exists
      try {
        await db.query(
          'INSERT INTO wallet_ledger (user_id, entry_type, amount, note) VALUES (?, ?, ?, ?)',
          [userId, `add_funds_${source}`, amount, note || `Added funds to ${source}`]
        );
      } catch (error) {
        // Ignore if wallet_ledger table doesn't exist
      }
      
      // Get updated balances
      const [walletRows] = await db.query(
        'SELECT COALESCE(wallet_balance, 0) as wallet_balance FROM wallets WHERE user_id = ?',
        [userId]
      );
      
      const [accountSum] = await db.query(
        'SELECT COALESCE(SUM(balance), 0) as total_account_balance FROM accounts WHERE user_id = ?',
        [userId]
      );
      
      return {
        balances: {
          wallet_balance: Number(walletRows[0]?.wallet_balance || 0),
          account_balance: Number(accountSum[0]?.total_account_balance || 0)
        }
      };
    }),

  moveFunds: t.procedure
    .input(z.object({ direction: z.string(), amount: z.number().positive(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      const { direction, amount, note } = input;
      
      // Start a transaction to ensure all updates happen atomically
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        
        if (direction === 'wallet_to_account') {
          // Check if wallet has sufficient balance
          const [wallet] = await connection.query(
            'SELECT wallet_balance FROM users WHERE user_id = ?',
            [userId]
          );
          
          if (wallet.length === 0 || Number(wallet[0].wallet_balance || 0) < amount) {
            throw new Error('Insufficient wallet balance');
          }
          
          // Update users table
          const [userResult] = await connection.query(
            'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) - ? WHERE user_id = ? AND wallet_balance >= ?',
            [amount, userId, amount]
          );
          
          // If no rows were affected, it means the wallet balance was insufficient
          if (userResult.affectedRows === 0) {
            throw new Error('Insufficient wallet balance');
          }
          
          // Also update wallets table
          await connection.query(
            'UPDATE wallets SET wallet_balance = COALESCE(wallet_balance, 0) - ? WHERE user_id = ? AND wallet_balance >= ?',
            [amount, userId, amount]
          );
          
          // Update accounts
          await connection.query(
            'UPDATE accounts SET balance = balance + ? WHERE user_id = ?',
            [amount, userId]
          );
        } else {
          // Adding to wallet
          // Update users table
          await connection.query(
            'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE user_id = ?',
            [amount, userId]
          );
          
          // Also update wallets table
          await connection.query(
            'UPDATE wallets SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE user_id = ?',
            [amount, userId]
          );
        }
        
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
      // Try to log in wallet_ledger
      try {
        await db.query(
          'INSERT INTO wallet_ledger (user_id, entry_type, amount, note) VALUES (?, ?, ?, ?)',
          [userId, direction, amount, note || `Moved funds ${direction.replace('_', ' ')}`]
        );
      } catch (error) {
        // Ignore if wallet_ledger table doesn't exist
      }
      
      // Get updated balances
      const [walletRows] = await db.query(
        'SELECT COALESCE(wallet_balance, 0) as wallet_balance FROM wallets WHERE user_id = ?',
        [userId]
      );
      
      const [accountSum] = await db.query(
        'SELECT COALESCE(SUM(balance), 0) as total_account_balance FROM accounts WHERE user_id = ?',
        [userId]
      );
      
      return {
        balances: {
          wallet_balance: Number(walletRows[0]?.wallet_balance || 0),
          account_balance: Number(accountSum[0]?.total_account_balance || 0)
        }
      };
    }),

  transferToAccount: t.procedure
    .input(z.object({ 
      account_id: z.number().int(), 
      amount: z.number().positive(), 
      note: z.string().optional() 
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      const { account_id, amount, note } = input;
      
      // Check wallet balance
      const [wallet] = await db.query('SELECT wallet_balance FROM users WHERE user_id = ?', [userId]);
      if (wallet.length === 0 || Number(wallet[0].wallet_balance || 0) < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Check if account exists and belongs to user
      const [account] = await db.query(
        'SELECT account_id, bank_name FROM accounts WHERE account_id = ? AND user_id = ?',
        [account_id, userId]
      );
      if (account.length === 0) {
        throw new Error('Account not found');
      }
      
      const balanceBefore = Number(wallet[0].wallet_balance || 0);
      const balanceAfter = balanceBefore - amount;
      
      // Start a transaction to ensure both updates happen or none
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        
        // Transfer money: wallet -> account (update users table)
        const [userResult] = await connection.query(
          'UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ? AND wallet_balance >= ?',
          [amount, userId, amount]
        );
        
        // If no rows were affected, it means the wallet balance was insufficient
        if (userResult.affectedRows === 0) {
          throw new Error('Insufficient wallet balance');
        }
        
        // Also update the wallets table
        await connection.query(
          'UPDATE wallets SET wallet_balance = wallet_balance - ? WHERE user_id = ? AND wallet_balance >= ?',
          [amount, userId, amount]
        );
        
        // Update specific account balance
        await connection.query(
          'UPDATE accounts SET balance = balance + ? WHERE account_id = ? AND user_id = ?',
          [amount, account_id, userId]
        );
        
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
      // Log transaction in transaction_history table
      try {
        await logWalletToAccount(
          userId, 
          amount, 
          account[0].bank_name, 
          account_id, 
          balanceBefore, 
          balanceAfter
        );
      } catch (error) {
        console.error('Error logging wallet to account transaction:', error);
      }
      
      // Legacy log transaction in wallet_ledger (if exists)
      try {
        await db.query(
          'INSERT INTO wallet_ledger (user_id, entry_type, amount, note) VALUES (?, ?, ?, ?)',
          [userId, 'wallet_to_account', amount, note || 'Transfer from wallet to bank account']
        );
      } catch (e) {
        // Ignore if wallet_ledger doesn't exist
      }
      
      return { message: `₹${amount} transferred to account successfully` };
    }),

  addFromAccount: t.procedure
    .input(z.object({ 
      account_id: z.number().int(), 
      amount: z.number().positive(), 
      note: z.string().optional() 
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      const { account_id, amount, note } = input;
      
      // Check if account exists and belongs to user
      const [account] = await db.query(
        'SELECT balance, bank_name FROM accounts WHERE account_id = ? AND user_id = ?',
        [account_id, userId]
      );
      if (account.length === 0) {
        throw new Error('Account not found or unauthorized');
      }
      
      const currentBalance = Number(account[0].balance || 0);
      if (currentBalance < amount) {
        throw new Error(`Insufficient account balance. Available: ₹${currentBalance}`);
      }
      
      // Transfer money: account -> wallet
      // Deduct from specific account
      await db.query(
        'UPDATE accounts SET balance = balance - ? WHERE account_id = ? AND user_id = ?',
        [amount, account_id, userId]
      );
      
      // Add to user's wallet
      await db.query(
        'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE user_id = ?',
        [amount, userId]
      );
      
      // Log transaction in transaction_history table
      try {
        await logAccountToWallet(
          userId, 
          amount, 
          account[0].bank_name, 
          account_id, 
          currentBalance, 
          currentBalance - amount
        );
      } catch (error) {
        console.error('Error logging account to wallet transaction:', error);
      }
      
      // Legacy log the transaction
      try {
        await db.query(
          'INSERT INTO wallet_ledger (user_id, entry_type, amount, note) VALUES (?, ?, ?, ?)',
          [userId, 'account_to_wallet', amount, note || `Added to wallet from ${account[0].bank_name}`]
        );
      } catch (e) {
        // Ignore if wallet_ledger doesn't exist
      }
      
      // Get updated balances
      const [walletUpdated] = await db.query(
        'SELECT wallet_balance FROM users WHERE user_id = ?',
        [userId]
      );
      
      const [accountUpdated] = await db.query(
        'SELECT COALESCE(SUM(balance), 0) as total_account_balance FROM accounts WHERE user_id = ?',
        [userId]
      );
      
      return { 
        message: `₹${amount} added to wallet from ${account[0].bank_name}`,
        new_wallet_balance: Number(walletUpdated[0]?.wallet_balance || 0),
        new_account_balance: Number(accountUpdated[0]?.total_account_balance || 0)
      };
    }),
});

module.exports = { walletRouter, t };