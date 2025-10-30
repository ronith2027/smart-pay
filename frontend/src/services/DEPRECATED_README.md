# ⚠️ DEPRECATED: REST API Services

This directory contains deprecated REST API service code.

## Migration Status

✅ **Migrated to tRPC:**
- LoginPage (auth.register, auth.login)
- ModernDashboard (wallet.getBalances, wallet.getLedger, account.list, bill.list)
- BankAccountsPage (account.list, account.create)
- TransferPage (transfer.findUser, transfer.send, wallet.getBalances)

⚠️ **Still using REST (legacy):**
- Some account management operations (delete, setPrimary, addMoney)
- Bill payment operations  
- Some analytics endpoints

## For Developers

**For new features:** Use the tRPC client from `../trpc/TrpcProvider.jsx`

```jsx
import { useTrpc } from '../trpc/TrpcProvider.jsx';

function MyComponent() {
  const trpc = useTrpc();
  
  // Use tRPC procedures instead of axios
  const data = await trpc.wallet.getBalances.query();
  const result = await trpc.auth.login.mutate({ email, password });
}
```

**For existing code:** Only modify if breaking; otherwise leave as-is for stability.

## Backend tRPC Routes Available

- `trpc.auth.register` - User registration
- `trpc.auth.login` - User login
- `trpc.wallet.getBalances` - Get user wallet/account balances
- `trpc.wallet.getLedger` - Get transaction history
- `trpc.wallet.addFunds` - Add money to wallet/account
- `trpc.wallet.moveFunds` - Move money between wallet/account
- `trpc.account.list` - List user's bank accounts
- `trpc.account.create` - Create new bank account
- `trpc.transfer.findUser` - Find user by email/username
- `trpc.transfer.send` - Send money to another user
- `trpc.bill.list` - List user's bills
- `trpc.bill.pay` - Pay a bill

All tRPC endpoints automatically handle:
- JWT token authentication
- Type safety with Zod validation
- Error handling
- Request/response serialization