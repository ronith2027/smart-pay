const { initTRPC, TRPCError } = require('@trpc/server');
const { z } = require('zod');
const db = require('../../config/db');
const { executeTransfer } = require('../../controllers/transferController');

const t = initTRPC.context().create();

const transferRouter = t.router({
  findUser: t.procedure
    .input(z.object({ identifier: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
      }
      const currentUserId = ctx.user.id;
      const { identifier } = input;

      const [rows] = await db.query(
        'SELECT user_id, email, username, full_name, wallet_balance FROM users WHERE (email = ? OR username = ? OR full_name = ?) AND user_id != ?',
        [identifier, identifier, identifier, currentUserId]
      );

      if (rows.length > 0) {
        const user = rows[0];
        return {
          found: true,
          user: {
            user_id: user.user_id,
            full_name: user.full_name,
            name: user.full_name,
            email: user.email,
            username: user.username,
            wallet_balance: user.wallet_balance,
            user_id_public: user.username || user.email
          }
        };
      }
      return { found: false };
    }),

  send: t.procedure
    .input(z.object({
      to_user_id: z.number().int(),
      amount: z.number().positive(),
      source: z.string().default('wallet'),
      note: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
      }
      const fromUserId = ctx.user.id;
      const { to_user_id, amount, source, note } = input;

      if (fromUserId === to_user_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot transfer money to yourself. Use self transfer for moving money between your accounts.' });
      }

      try {
        const transferResult = await executeTransfer({
          fromUserId,
          toUserId: to_user_id,
          amount,
          source,
          note
        });

        return {
          success: true,
          message: 'Transfer completed successfully',
          transfer: {
            amount: transferResult.amount,
            transfer_reference: transferResult.transfer_reference,
            to_user: {
              name: transferResult.recipient.name,
              email: transferResult.recipient.email
            },
            from_user: {
              name: transferResult.sender.name,
              email: transferResult.sender.email
            },
            source_type: transferResult.source,
            note: transferResult.note || null,
            status: 'Success',
            transfer_date: transferResult.transfer_date
          },
          destination_type: transferResult.destination_type,
          destination_details: transferResult.destination_details,
          updated_balances: transferResult.updated_balances
        };
      } catch (error) {
        console.error('Transfer failed:', error);
        if (error?.statusCode === 400) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        if (error?.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to process transfer' });
      }
    }),
    
  selfTransfer: t.procedure
    .input(z.object({
      from_account_id: z.number().int(),
      to_account_id: z.number().int(),
      amount: z.number().positive(),
      note: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
      }
      
      const userId = ctx.user.id;
      const { from_account_id, to_account_id, amount, note } = input;
      
      // Validate that both accounts belong to the user
      const [accounts] = await db.query(
        'SELECT account_id, bank_name FROM accounts WHERE user_id = ? AND account_id IN (?, ?)',
        [userId, from_account_id, to_account_id]
      );
      
      if (accounts.length !== 2) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'One or both accounts not found or do not belong to you' 
        });
      }
      
      // Prevent transfers between the same account
      if (from_account_id === to_account_id) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Cannot transfer money to the same account' 
        });
      }
      
      try {
        const transferResult = await executeTransfer({
          fromUserId: userId,
          toUserId: userId,
          amount,
          source: 'account',
          note,
          isSelfTransfer: true,
          fromAccountId: from_account_id,
          toAccountId: to_account_id
        });

        return {
          success: true,
          message: 'Self transfer completed successfully',
          transfer: {
            amount: transferResult.amount,
            transfer_reference: transferResult.transfer_reference,
            from_account: {
              account_id: from_account_id,
              bank_name: accounts.find(a => a.account_id === from_account_id)?.bank_name
            },
            to_account: {
              account_id: to_account_id,
              bank_name: accounts.find(a => a.account_id === to_account_id)?.bank_name
            },
            note: transferResult.note || null,
            status: 'Success',
            transfer_date: transferResult.transfer_date
          }
        };
      } catch (error) {
        console.error('Self transfer failed:', error);
        if (error?.statusCode === 400) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        if (error?.statusCode === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
        }
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: error.message || 'Failed to process self transfer' 
        });
      }
    })
});

// Export the router with all procedures
module.exports = { transferRouter };
