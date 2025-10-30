import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ModernDashboard from './pages/ModernDashboard';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import AddPaymentPage from './pages/AddPaymentPage';
import BillsPage from './pages/BillsPage';
import TransferPage from './pages/TransferPage';
import BankAccountsPage from './pages/BankAccountsPage';
import WalletPage from './pages/WalletPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';

// --- TEMPORARY CHANGE FOR DEVELOPMENT ---
// This will now always allow you to see the private pages.
const PrivateRoute = ({ children }) => {
  // const token = localStorage.getItem('token'); // The original logic is commented out.
  // return token ? children : <Navigate to="/" />;
  return children; // Always return the children, allowing access.
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<PrivateRoute><ModernDashboard /></PrivateRoute>} />
        <Route path="/bills" element={<PrivateRoute><BillsPage /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><PaymentHistoryPage /></PrivateRoute>} />
        <Route path="/add-payment" element={<PrivateRoute><AddPaymentPage /></PrivateRoute>} />
        <Route path="/add-account" element={<PrivateRoute><BankAccountsPage /></PrivateRoute>} />
        <Route path="/accounts" element={<PrivateRoute><BankAccountsPage /></PrivateRoute>} />
        <Route path="/wallet" element={<PrivateRoute><WalletPage /></PrivateRoute>} />
        <Route path="/transfer" element={<PrivateRoute><TransferPage /></PrivateRoute>} />
        <Route path="/transactions" element={<PrivateRoute><TransactionHistoryPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;