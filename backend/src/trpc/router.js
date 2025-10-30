const { initTRPC } = require('@trpc/server');
const { walletRouter } = require('./routers/wallet');
const { authRouter } = require('./routers/auth');
const { accountRouter } = require('./routers/account');
const { transferRouter } = require('./routers/transfer');
const { billRouter } = require('./routers/bill');
const { transactionHistoryRouter } = require('./routers/transactionHistory');

const t = initTRPC.context().create();

const appRouter = t.router({
  auth: authRouter,
  wallet: walletRouter,
  account: accountRouter,
  transfer: transferRouter,
  bill: billRouter,
  transactionHistory: transactionHistoryRouter,
});

module.exports = { appRouter };

// Inference helper for frontend
/**
 * @typedef {import('@trpc/server').inferRouterInputs<typeof appRouter>} AppRouterInputs
 * @typedef {import('@trpc/server').inferRouterOutputs<typeof appRouter>} AppRouterOutputs
 */
