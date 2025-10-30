const { initTRPC } = require('@trpc/server');
const { z } = require('zod');
const db = require('../../config/db');

const t = initTRPC.context().create();

const transactionHistoryRouter = t.router({
  // Get transaction history with filters and pagination
  getHistory: t.procedure
    .input(z.object({
      limit: z.number().int().positive().max(100).default(20),
      offset: z.number().int().min(0).default(0),
      transaction_type: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      start_date: z.string().optional(), // ISO date string
      end_date: z.string().optional(),   // ISO date string
      search: z.string().optional()      // Search in description or reference number
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      
      let whereConditions = ['th.user_id = ?'];
      let queryParams = [userId];
      
      // Add filters
      if (input.transaction_type) {
        whereConditions.push('th.transaction_type = ?');
        queryParams.push(input.transaction_type);
      }
      
      if (input.category) {
        whereConditions.push('th.category = ?');
        queryParams.push(input.category);
      }
      
      if (input.status) {
        whereConditions.push('th.status = ?');
        queryParams.push(input.status);
      }
      
      if (input.start_date) {
        whereConditions.push('th.transaction_date >= ?');
        queryParams.push(input.start_date);
      }
      
      if (input.end_date) {
        whereConditions.push('th.transaction_date <= ?');
        queryParams.push(input.end_date);
      }
      
      if (input.search) {
        whereConditions.push('(th.description LIKE ? OR th.reference_number LIKE ? OR th.source_name LIKE ? OR th.destination_name LIKE ?)');
        const searchTerm = `%${input.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      try {
        // Get transactions with detailed information
        const [transactions] = await db.query(`
          SELECT 
            th.*,
            u.username as user_name,
            u.email as user_email,
            b.provider_name as bill_provider,
            b.bill_type as bill_type,
            CASE 
                WHEN th.destination_type = 'USER' THEN (
                    SELECT username FROM users WHERE user_id = th.destination_id
                )
                ELSE NULL
            END as destination_user_name,
            CASE 
                WHEN th.source_type = 'BANK_ACCOUNT' THEN (
                    SELECT CONCAT(bank_name, ' - ', SUBSTR(account_number, -4)) 
                    FROM accounts 
                    WHERE account_id = th.source_id AND user_id = th.user_id
                )
                ELSE NULL
            END as source_account_details,
            CASE 
                WHEN th.destination_type = 'BANK_ACCOUNT' THEN (
                    SELECT CONCAT(bank_name, ' - ', SUBSTR(account_number, -4)) 
                    FROM accounts 
                    WHERE account_id = th.destination_id AND user_id = th.user_id
                )
                ELSE NULL
            END as destination_account_details
          FROM transaction_history th
          LEFT JOIN users u ON th.user_id = u.user_id
          LEFT JOIN bills b ON th.bill_id = b.bill_id
          ${whereClause}
          ORDER BY th.transaction_date DESC, th.created_at DESC
          LIMIT ? OFFSET ?
        `, [...queryParams, input.limit, input.offset]);
        
        // Get total count for pagination
        const [countResult] = await db.query(`
          SELECT COUNT(*) as total 
          FROM transaction_history th
          ${whereClause}
        `, queryParams);
        
        const total = countResult[0]?.total || 0;
        
        // Format transactions
        const formattedTransactions = transactions.map(tx => ({
          ...tx,
          amount: parseFloat(tx.amount),
          balance_before: tx.balance_before ? parseFloat(tx.balance_before) : null,
          balance_after: tx.balance_after ? parseFloat(tx.balance_after) : null,
          transaction_date: tx.transaction_date,
          created_at: tx.created_at,
          updated_at: tx.updated_at
        }));
        
        return {
          transactions: formattedTransactions,
          pagination: {
            total,
            limit: input.limit,
            offset: input.offset,
            has_more: (input.offset + input.limit) < total,
            total_pages: Math.ceil(total / input.limit)
          }
        };
        
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        throw new Error('Failed to fetch transaction history');
      }
    }),

  // Get transaction statistics
  getStatistics: t.procedure
    .input(z.object({
      period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d')
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      
      let dateCondition = '';
      let queryParams = [userId];
      
      const now = new Date();
      let startDate;
      
      switch (input.period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          startDate = null;
          break;
      }
      
      if (startDate) {
        dateCondition = ' AND transaction_date >= ?';
        queryParams.push(startDate.toISOString());
      }
      
      try {
        // Get overall statistics
        const [overallStats] = await db.query(`
          SELECT 
            COUNT(*) as total_transactions,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(AVG(amount), 0) as avg_transaction_amount,
            COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_transactions,
            COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_transactions,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_transactions
          FROM transaction_history 
          WHERE user_id = ? AND status = 'SUCCESS'${dateCondition}
        `, queryParams);
        
        // Get statistics by transaction type
        const [typeStats] = await db.query(`
          SELECT 
            transaction_type,
            COUNT(*) as count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM transaction_history 
          WHERE user_id = ? AND status = 'SUCCESS'${dateCondition}
          GROUP BY transaction_type
          ORDER BY total_amount DESC
        `, queryParams);
        
        // Get statistics by category
        const [categoryStats] = await db.query(`
          SELECT 
            category,
            COUNT(*) as count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM transaction_history 
          WHERE user_id = ? AND status = 'SUCCESS'${dateCondition}
          GROUP BY category
          ORDER BY total_amount DESC
        `, queryParams);
        
        // Get monthly spending trend (last 6 months)
        const [monthlyTrend] = await db.query(`
          SELECT 
            DATE_FORMAT(transaction_date, '%Y-%m') as month,
            COUNT(*) as transaction_count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM transaction_history 
          WHERE user_id = ? AND status = 'SUCCESS' 
            AND transaction_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
          ORDER BY month DESC
        `, [userId]);
        
        return {
          period: input.period,
          overall: {
            total_transactions: parseInt(overallStats[0]?.total_transactions || 0),
            total_amount: parseFloat(overallStats[0]?.total_amount || 0),
            avg_transaction_amount: parseFloat(overallStats[0]?.avg_transaction_amount || 0),
            successful_transactions: parseInt(overallStats[0]?.successful_transactions || 0),
            failed_transactions: parseInt(overallStats[0]?.failed_transactions || 0),
            pending_transactions: parseInt(overallStats[0]?.pending_transactions || 0),
            success_rate: overallStats[0]?.total_transactions > 0 
              ? ((overallStats[0]?.successful_transactions / overallStats[0]?.total_transactions) * 100).toFixed(2)
              : 0
          },
          by_type: typeStats.map(stat => ({
            transaction_type: stat.transaction_type,
            count: parseInt(stat.count),
            total_amount: parseFloat(stat.total_amount)
          })),
          by_category: categoryStats.map(stat => ({
            category: stat.category,
            count: parseInt(stat.count),
            total_amount: parseFloat(stat.total_amount)
          })),
          monthly_trend: monthlyTrend.map(month => ({
            month: month.month,
            transaction_count: parseInt(month.transaction_count),
            total_amount: parseFloat(month.total_amount)
          }))
        };
        
      } catch (error) {
        console.error('Error fetching transaction statistics:', error);
        throw new Error('Failed to fetch transaction statistics');
      }
    }),

  // Get recent transactions (quick view)
  getRecent: t.procedure
    .input(z.object({
      limit: z.number().int().positive().max(50).default(10)
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      
      try {
        const [transactions] = await db.query(`
          SELECT 
            id,
            transaction_type,
            amount,
            source_name,
            destination_name,
            description,
            status,
            reference_number,
            transaction_date,
            created_at
          FROM transaction_history 
          WHERE user_id = ?
          ORDER BY transaction_date DESC, created_at DESC
          LIMIT ?
        `, [userId, input.limit]);
        
        return transactions.map(tx => ({
          ...tx,
          amount: parseFloat(tx.amount)
        }));
        
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        throw new Error('Failed to fetch recent transactions');
      }
    }),

  // Get transaction by ID
  getById: t.procedure
    .input(z.object({
      transaction_id: z.number().int()
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('Unauthorized');
      const userId = ctx.user.id;
      
      try {
        const [transactions] = await db.query(`
          SELECT th.*, u.username, u.email
          FROM transaction_history th
          LEFT JOIN users u ON th.user_id = u.user_id
          WHERE th.id = ? AND th.user_id = ?
        `, [input.transaction_id, userId]);
        
        if (transactions.length === 0) {
          throw new Error('Transaction not found');
        }
        
        const transaction = transactions[0];
        return {
          ...transaction,
          amount: parseFloat(transaction.amount),
          balance_before: transaction.balance_before ? parseFloat(transaction.balance_before) : null,
          balance_after: transaction.balance_after ? parseFloat(transaction.balance_after) : null
        };
        
      } catch (error) {
        console.error('Error fetching transaction by ID:', error);
        throw new Error('Failed to fetch transaction details');
      }
    })
});

module.exports = { transactionHistoryRouter, t };