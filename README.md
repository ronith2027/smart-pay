# SMART PAY

A full-stack web application for tracking personal payment history with user authentication and profile management.

## Features

- **User Authentication**: Username/password based login and registration
- **Profile Management**: Update profile information and upload profile images
- **Payment Tracking**: Add, view, and manage payment history
- **Secure**: JWT-based authentication with bcrypt password hashing
- **Responsive**: Modern React frontend with clean UI

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database with mysql2 driver
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **CORS** enabled

### Frontend
- **React** with functional components and hooks
- **React Router** for navigation
- **CSS3** with modern styling

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL (XAMPP or standalone)
- Git

### 1. Clone and Install
```bash
git clone <repository-url>
cd payment-history-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

#### Option A: Using MySQL Workbench (Recommended)
1. Open MySQL Workbench
2. Connect to your MySQL server (localhost:3306)
3. Run the SQL script: `backend/database.sql`

#### Option B: Using Command Line
```bash
cd backend
mysql -u root -p < database.sql
```

#### Option C: Auto-setup (Recommended for first time)
```bash
cd backend
node reset-database.js
```

### 3. Environment Configuration
Create `backend/config.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=payment_history_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=my_super_secret_jwt_key_2024

# Server Configuration
PORT=3001

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/profiles
```

### 4. Start the Application
```bash
# Terminal 1: Start Backend
cd backend
npm start

# Terminal 2: Start Frontend
cd frontend
npm start
```

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3002

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `PUT /auth/change-password` - Change password
- `PUT /auth/profile-image` - Update profile image

### Payments
- `GET /payments` - Get user's payment history
- `POST /payments` - Add new payment
- `PUT /payments/:id` - Update payment
- `DELETE /payments/:id` - Delete payment

## Sample Users

For testing, the following users are pre-created:
- **Username**: `johndoe`, **Password**: `password123`
- **Username**: `janesmith`, **Password**: `password123`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NULL,
  profile_image VARCHAR(255) NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Payments Table
```sql
CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL,
  date_of_transaction DATE NOT NULL,
  notes TEXT,
  date_of_entry TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

## File Structure
```
payment-history-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── paymentController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── uploadMiddleware.js
│   │   └── routes/
│   │       ├── authRoutes.js
│   │       └── paymentRoutes.js
│   ├── uploads/
│   ├── config.env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── AddPaymentPage.js
│   │   │   └── PaymentHistoryPage.js
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.js
│   └── package.json
└── README.md
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure MySQL service is running
   - Check database credentials in `config.env`
   - Verify database exists: `payment_history_db`

2. **Port Already in Use**
   - Change port in `config.env` or kill existing process
   - Use `netstat -ano | findstr :3001` to find process

3. **File Upload Issues**
   - Ensure `uploads/` directory exists
   - Check file size limits in `config.env`

4. **Authentication Errors**
   - Verify JWT_SECRET in `config.env`
   - Check token expiration (7 days default)

## Development

### Adding New Features
1. Create controller functions in appropriate controller file
2. Add routes in route files
3. Update frontend components as needed
4. Test with sample data

### Database Changes
1. Update schema in `database.sql`
2. Run migration scripts
3. Update related controllers and models

## License

This project is for educational purposes.

## Support

For issues or questions, please check the troubleshooting section or create an issue in the repository.
