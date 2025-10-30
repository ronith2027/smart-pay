const mysql = require('mysql2');

console.log('🚀 Creating Payment History Database...');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    return;
  }
  
  console.log('✅ Connected to MySQL successfully!');
  
  // Create database
  connection.query('CREATE DATABASE IF NOT EXISTS payment_history_db', (err) => {
    if (err) {
      console.error('❌ Error creating database:', err.message);
      connection.end();
      return;
    }
    
    console.log('✅ Database "payment_history_db" created/verified!');
    
    // Use the database
    connection.query('USE payment_history_db', (err) => {
      if (err) {
        console.error('❌ Error using database:', err.message);
        connection.end();
        return;
      }
      
      console.log('✅ Using database "payment_history_db"');
      
      // Create users table
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          user_id INT AUTO_INCREMENT PRIMARY KEY,
          mobile_number VARCHAR(15) UNIQUE NOT NULL,
          user_id_public VARCHAR(50) UNIQUE NOT NULL,
          full_name VARCHAR(100),
          email VARCHAR(100),
          password_hash VARCHAR(255),
          username VARCHAR(50) UNIQUE,
          profile_image VARCHAR(255),
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      connection.query(createUsersTable, (err) => {
        if (err) {
          console.error('❌ Error creating users table:', err.message);
        } else {
          console.log('✅ Users table created/verified!');
        }
        
        // Create payments table
        const createPaymentsTable = `
          CREATE TABLE IF NOT EXISTS payments (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_mode VARCHAR(50) NOT NULL,
            date_of_transaction DATE NOT NULL,
            notes TEXT,
            date_of_entry TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
          )
        `;
        
        connection.query(createPaymentsTable, (err) => {
          if (err) {
            console.error('❌ Error creating payments table:', err.message);
          } else {
            console.log('✅ Payments table created/verified!');
          }
          
          // Insert sample data
          const insertUsers = `
            INSERT IGNORE INTO users (email, full_name, mobile_number, user_id_public, password_hash, is_verified) VALUES 
            ('john@example.com', 'John Doe', '9998887776', 'john_doe', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE),
            ('jane@example.com', 'Jane Smith', '8887776665', 'jane_smith', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE)
          `;
          
          connection.query(insertUsers, (err) => {
            if (err) {
              console.error('❌ Error inserting users:', err.message);
            } else {
              console.log('✅ Sample users added!');
            }
            
            // Insert sample payments
            const insertPayments = `
              INSERT IGNORE INTO payments (user_id, amount, payment_mode, date_of_transaction, notes) VALUES 
              (1, 1500.00, 'UPI', '2024-01-15', 'Grocery shopping'),
              (1, 2500.00, 'Credit Card', '2024-01-20', 'Online purchase'),
              (2, 800.00, 'Cash', '2024-01-18', 'Restaurant bill')
            `;
            
            connection.query(insertPayments, (err) => {
              if (err) {
                console.error('❌ Error inserting payments:', err.message);
              } else {
                console.log('✅ Sample payments added!');
              }
              
              console.log('\n🎉 Database setup complete!');
              console.log('📊 Database: payment_history_db');
              console.log('👥 Tables: users, payments');
              console.log('📱 Sample users: john@example.com/password, jane@example.com/password');
              console.log('\nNow you can run: npm start');
              
              connection.end();
            });
          });
        });
      });
    });
  });
});
