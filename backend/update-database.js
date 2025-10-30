const mysql = require('mysql2');

console.log('🚀 Updating Payment History Database...');

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
  
  // Update users table with profile fields
  const alterUsersTable = `
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS otp VARCHAR(6) NULL,
    ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP NULL
  `;
  
  connection.query(alterUsersTable, (err) => {
    if (err) {
      console.error('❌ Error updating users table:', err.message);
    } else {
      console.log('✅ Users table updated with profile fields!');
    }
    
    // Create uploads directory reference
    console.log('📁 Profile images will be stored in: uploads/profiles/');
    
    console.log('\n🎉 Database update complete!');
    console.log('📊 New fields added:');
    console.log('  - full_name: User\'s full name');
    console.log('  - email: User\'s email address');
    console.log('  - profile_image: Path to profile image');
    console.log('  - is_verified: OTP verification status');
    console.log('  - otp: One-time password for verification');
    console.log('  - otp_expires_at: OTP expiration time');
    
    connection.end();
  });
});
