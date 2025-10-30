const mysql = require('mysql2');

console.log('🚀 Updating Database for Email-based Authentication...');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306,
  database: 'payment_history_db'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    return;
  }
  
  console.log('✅ Connected to MySQL successfully!');
  
  // Update users table to use email instead of mobile_number
  const alterUsersTable = `
    ALTER TABLE users 
    DROP COLUMN IF EXISTS mobile_number,
    ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE NOT NULL,
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS otp VARCHAR(6) NULL,
    ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP NULL
  `;
  
  connection.query(alterUsersTable, (err) => {
    if (err) {
      console.error('❌ Error updating users table:', err.message);
    } else {
      console.log('✅ Users table updated for email authentication!');
    }
    
    // Update existing sample data
    const updateSampleData = `
      UPDATE users SET 
        email = 'john.doe@example.com',
        full_name = 'John Doe'
      WHERE user_id = 1;
      
      UPDATE users SET 
        email = 'jane.smith@example.com',
        full_name = 'Jane Smith'
      WHERE user_id = 2;
    `;
    
    connection.query(updateSampleData, (err) => {
      if (err) {
        console.error('❌ Error updating sample data:', err.message);
      } else {
        console.log('✅ Sample data updated with email addresses!');
      }
      
      console.log('\n🎉 Database update complete!');
      console.log('📊 New structure:');
      console.log('  - email: User\'s email address (unique, required)');
      console.log('  - full_name: User\'s full name');
      console.log('  - profile_image: Path to profile image');
      console.log('  - is_verified: OTP verification status');
      console.log('  - otp: One-time password for verification');
      console.log('  - otp_expires_at: OTP expiration time');
      console.log('\n📧 Sample users:');
      console.log('  - john.doe@example.com');
      console.log('  - jane.smith@example.com');
      
      connection.end();
    });
  });
});
