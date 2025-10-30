const mysql = require('mysql2');

console.log('🔄 Resetting Database for Username/Password Authentication...');

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
  
  // Drop and recreate database
  connection.query('DROP DATABASE IF EXISTS payment_history_db', (err) => {
    if (err) {
      console.error('❌ Error dropping database:', err.message);
      return;
    }
    
    console.log('✅ Old database dropped');
    
    // Create new database
    connection.query('CREATE DATABASE payment_history_db', (err) => {
      if (err) {
        console.error('❌ Error creating database:', err.message);
        return;
      }
      
      console.log('✅ New database created');
      
      // Use the database
      connection.query('USE payment_history_db', (err) => {
        if (err) {
          console.error('❌ Error using database:', err.message);
          return;
        }
        
        console.log('✅ Using new database');
        
        // Create users table
        const createUsersTable = `
          CREATE TABLE users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NULL,
            profile_image VARCHAR(255) NULL,
            wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            account_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            is_verified BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;
        
        connection.query(createUsersTable, (err) => {
          if (err) {
            console.error('❌ Error creating users table:', err.message);
            return;
          }
          
          console.log('✅ Users table created');
          
          // Create user_accounts table
          const createAccountsTable = `
            CREATE TABLE user_accounts (
              account_id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              bank_name VARCHAR(100) NOT NULL,
              account_number VARCHAR(32) NOT NULL,
              ifsc_code VARCHAR(20) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, account_number),
              FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
          `;

          connection.query(createAccountsTable, (err) => {
            if (err) {
              console.error('❌ Error creating user_accounts table:', err.message);
              return;
            }

            console.log('✅ User accounts table created');

            // Create payments table
            const createPaymentsTable = `
              CREATE TABLE payments (
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
                return;
              }
              
              console.log('✅ Payments table created');
              
              // Create transfers table
              const createTransfersTable = `
                CREATE TABLE transfers (
                  transfer_id INT AUTO_INCREMENT PRIMARY KEY,
                  from_user_id INT NOT NULL,
                  to_user_id INT NOT NULL,
                  amount DECIMAL(12,2) NOT NULL,
                  note VARCHAR(255) NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (from_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                  FOREIGN KEY (to_user_id) REFERENCES users(user_id) ON DELETE CASCADE
                )
              `;

              connection.query(createTransfersTable, (err) => {
                if (err) {
                  console.error('❌ Error creating transfers table:', err.message);
                  return;
                }

                console.log('✅ Transfers table created');

                // Create wallet_ledger table
                const createLedgerTable = `
                  CREATE TABLE wallet_ledger (
                    ledger_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    entry_type ENUM('add_wallet','add_account','account_to_wallet','wallet_to_account') NOT NULL,
                    amount DECIMAL(12,2) NOT NULL,
                    note VARCHAR(255) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                  )
                `;

                connection.query(createLedgerTable, (err) => {
                  if (err) {
                    console.error('❌ Error creating wallet_ledger table:', err.message);
                    return;
                  }

                  console.log('✅ Wallet ledger table created');
                
                  // Insert sample users with proper password hashes
                  const bcrypt = require('bcryptjs');
                  const hashPassword = async (password) => {
                    const saltRounds = 10;
                    return await bcrypt.hash(password, saltRounds);
                  };
                  
                  const insertSampleData = async () => {
                    try {
                      const passwordHash1 = await hashPassword('password123');
                      const passwordHash2 = await hashPassword('password123');
                      
                      const insertUsers = `
                        INSERT INTO users (username, password_hash, full_name, email, wallet_balance, account_balance) VALUES 
                        ('johndoe', ?, 'John Doe', 'john.doe@example.com', 1500.00, 5000.00),
                        ('janesmith', ?, 'Jane Smith', 'jane.smith@example.com', 800.00, 3200.00)
                      `;
                      
                      connection.query(insertUsers, [passwordHash1, passwordHash2], (err) => {
                        if (err) {
                          console.error('❌ Error inserting users:', err.message);
                        } else {
                          console.log('✅ Sample users created');
                        }
                        
                        // Insert sample accounts
                        const insertAccounts = `
                          INSERT INTO user_accounts (user_id, bank_name, account_number, ifsc_code) VALUES 
                          (1, 'HDFC Bank', '123456789012', 'HDFC0001234'),
                          (2, 'SBI Bank', '987654321098', 'SBIN0005678')
                        `;

                        connection.query(insertAccounts, (err) => {
                          if (err) {
                            console.error('❌ Error inserting accounts:', err.message);
                          } else {
                            console.log('✅ Sample bank accounts created');
                          }

                          // Insert sample payments
                          const insertPayments = `
                            INSERT INTO payments (user_id, amount, payment_mode, date_of_transaction, notes) VALUES 
                            (1, 1500.00, 'UPI', '2024-01-15', 'Grocery shopping'),
                            (1, 2500.00, 'Credit Card', '2024-01-20', 'Online purchase'),
                            (2, 800.00, 'Cash', '2024-01-18', 'Restaurant bill')
                          `;
                          
                          connection.query(insertPayments, (err) => {
                            if (err) {
                              console.error('❌ Error inserting payments:', err.message);
                            } else {
                              console.log('✅ Sample payments created');
                            }

                            const insertLedger = `
                              INSERT INTO wallet_ledger (user_id, entry_type, amount, note) VALUES 
                              (1, 'add_wallet', 500.00, 'Initial top-up'),
                              (1, 'wallet_to_account', 200.00, 'Savings'),
                              (2, 'account_to_wallet', 300.00, 'Cashback move')
                            `;

                            connection.query(insertLedger, (err) => {
                              if (err) {
                                console.error('❌ Error inserting ledger entries:', err.message);
                              } else {
                                console.log('✅ Sample ledger entries created');
                              }
                              
                              console.log('\n🎉 Database reset complete!');
                              console.log('📊 New structure:');
                              console.log('  - users: wallet_balance, account_balance');
                              console.log('  - user_accounts: bank details');
                              console.log('  - transfers: peer transfers');
                              console.log('  - wallet_ledger: wallet/account movements');
                              console.log('\n👥 Sample users:');
                              console.log('  - Username: johndoe, Password: password123');
                              console.log('  - Username: janesmith, Password: password123');
                              
                              connection.end();
                            });
                          });
                        });
                      });
                    } catch (error) {
                      console.error('❌ Error hashing passwords:', error.message);
                      connection.end();
                    }
                  };
                  
                  insertSampleData();
                });
              });
            });
          });
        });
      });
    });
  });
});
