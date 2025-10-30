const { initTRPC } = require('@trpc/server');
const { z } = require('zod');
const db = require('../../config/db');

const t = initTRPC.context().create();

const accountRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error('Unauthorized');
    const userId = ctx.user.id;
    try {
      const [rows] = await db.query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
      return rows;
    } catch (e) {
      return [];
    }
  }),

  create: t.procedure
    .input(z.object({
      bank_name: z.string(),
      account_number: z.string(),
      account_type: z.string().default('Savings'), // Maps to bank_type in DB
      ifsc: z.string(), // Maps to ifsc_code in DB  
      holder_name: z.string().optional(), // Not in DB, will ignore for now
      current_balance: z.number().nonnegative().default(0) // Maps to balance in DB
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      const [result] = await db.query(
        'INSERT INTO accounts (user_id, bank_name, account_number, bank_type, ifsc_code, balance) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, input.bank_name, input.account_number, input.account_type, input.ifsc, input.current_balance]
      );
      
      return { account_id: result.insertId, message: 'Account created successfully' };
    }),

  delete: t.procedure
    .input(z.object({ account_id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      
      // First get the account balance before deletion
      const [accountToDelete] = await db.query(
        'SELECT balance FROM accounts WHERE account_id = ? AND user_id = ?',
        [input.account_id, userId]
      );
      
      if (accountToDelete.length === 0) {
        throw new Error('Account not found or unauthorized');
      }
      
      const deletedBalance = Number(accountToDelete[0].balance || 0);
      
      // Delete the account
      const [result] = await db.query(
        'DELETE FROM accounts WHERE account_id = ? AND user_id = ?',
        [input.account_id, userId]
      );
      
      return { message: 'Account deleted successfully', deleted_balance: deletedBalance };
    }),

  setPrimary: t.procedure
    .input(z.object({ account_id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      // First, unset all primary accounts for this user
      await db.query('UPDATE accounts SET is_primary = 0 WHERE user_id = ?', [userId]);
      // Then set the selected account as primary
      const [result] = await db.query(
        'UPDATE accounts SET is_primary = 1 WHERE account_id = ? AND user_id = ?',
        [input.account_id, userId]
      );
      if (result.affectedRows === 0) {
        throw new Error('Account not found or unauthorized');
      }
      return { message: 'Primary account updated successfully' };
    }),

  addMoney: t.procedure
    .input(z.object({ 
      account_id: z.number().int(), 
      amount: z.number().positive(), 
      source: z.string().default('wallet'),
      note: z.string().optional() 
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      const { account_id, amount, source, note } = input;
      
      // Check if account exists and belongs to user
      const [account] = await db.query(
        'SELECT balance FROM accounts WHERE account_id = ? AND user_id = ?',
        [account_id, userId]
      );
      if (account.length === 0) {
        throw new Error('Account not found');
      }
      
      // Update account balance
      await db.query(
        'UPDATE accounts SET balance = balance + ? WHERE account_id = ? AND user_id = ?',
        [amount, account_id, userId]
      );
      
      // If source is wallet, deduct from wallet balance
      if (source === 'wallet') {
        await db.query(
          'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) - ? WHERE user_id = ?',
          [amount, userId]
        );
      }
      
      // Log the transaction
      try {
        await db.query(
          'INSERT INTO wallet_ledger (user_id, entry_type, amount, note) VALUES (?, ?, ?, ?)',
          [userId, 'account_deposit', amount, note || `Added money to bank account from ${source}`]
        );
      } catch (e) {
        // Ignore if wallet_ledger doesn't exist
      }
      
      return { message: `₹${amount} added to account successfully` };
    }),
});

module.exports = { accountRouter, t };