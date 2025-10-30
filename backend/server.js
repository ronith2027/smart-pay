const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const db = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const billRoutes = require('./src/routes/billRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const transferRoutes = require('./src/routes/transferRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (profile images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection with better logging and schema alignment
const { ensureSchema } = require('./src/utils/ensureSchema');
db.getConnection()
  .then(async (connection) => {
    console.log('✅ Database connection pool created successfully');
    connection.release();
    await db.query('SELECT 1');
    // Ensure schema matches code expectations
    await ensureSchema();
  })
  .then(() => {
    console.log('✅ Database connected and schema ensured successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bill', billRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/transfer', transferRoutes);

// tRPC
const { createContext } = require('./src/trpc/context');
const { appRouter } = require('./src/trpc/router');
const { createExpressMiddleware } = require('@trpc/server/adapters/express');
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

// Root endpoint for health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Payment History API Server is running' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
  console.log(`📁 Profile images: http://localhost:${PORT}/uploads/profiles/`);
});