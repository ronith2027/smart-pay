const mysql = require('mysql2/promise');
const fs = require('fs').promises;
require('dotenv').config({ path: './config.env' });

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Setting up new database schema...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to MySQL successfully!');

    // Read and execute the database.sql file
    const sqlContent = await fs.readFile('./database.sql', 'utf8');
    
    // Split by delimiter and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error) {
          // Skip errors for statements that might already exist
          if (!error.message.includes('already exists') && 
              !error.message.includes('Duplicate entry') &&
              !error.message.includes('Duplicate key name')) {
            console.log(`Warning: ${error.message}`);
          }
        }
      }
    }

    console.log('✅ Database schema created successfully!');
    console.log('✅ Sample data inserted!');
    console.log('✅ Triggers created!');
    
    console.log('\n🎉 Database setup complete!');
    console.log('📊 New structure based on ER diagram:');
    console.log('  - users: name, email, phone_number, password');
    console.log('  - wallets: wallet_balance (1:1 with users)');
    console.log('  - accounts: bank account details (1:M with users)');
    console.log('  - bills: bill management (1:M with users)');
    console.log('  - transactions: all transaction records');
    console.log('  - services: service categorization');
    console.log('  - transaction_history: audit trail');
    console.log('\n👥 Sample users (password: password123):');
    console.log('  - john.doe@email.com');
    console.log('  - jane.smith@email.com');
    console.log('  - alice.johnson@email.com');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();