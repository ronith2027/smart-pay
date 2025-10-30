# Payment History App - Backend

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
1. Make sure MySQL is running on your system
2. Update the `config.env` file with your MySQL credentials:
   - `DB_USER`: Your MySQL username (default: root)
   - `DB_PASSWORD`: Your MySQL password
   - `DB_NAME`: Database name (default: payment_history_db)
   - `DB_HOST`: MySQL host (default: localhost)
   - `DB_PORT`: MySQL port (default: 3306)

### 3. Create Database Tables
Run the SQL script to create the database and tables:
```bash
mysql -u your_username -p < database.sql
```

Or manually execute the SQL commands in your MySQL client.

### 4. Start the Server
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The server will start on port 3001.

### 5. Test the API
- Health check: `GET http://localhost:3001/api/health`
- Send OTP: `POST http://localhost:3001/api/auth/send-otp`
- Verify OTP: `POST http://localhost:3001/api/auth/verify-otp`
- Get payments: `GET http://localhost:3001/api/payments`
- Add payment: `POST http://localhost:3001/api/payments`

## Environment Variables
- `DB_HOST`: MySQL host
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: Database name
- `DB_PORT`: MySQL port
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 3001)

## Database Schema
- **users**: Stores user information (mobile number)
- **payments**: Stores payment transactions with user reference
