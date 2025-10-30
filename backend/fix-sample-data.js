const mysql = require('mysql2');

console.log('🔧 Fixing Sample Data...');

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
  
  // Update sample data with proper SQL syntax
  const updateUser1 = 'UPDATE users SET email = ?, full_name = ? WHERE user_id = 1';
  const updateUser2 = 'UPDATE users SET email = ?, full_name = ? WHERE user_id = 2';
  
  // Update first user
  connection.query(updateUser1, ['john.doe@example.com', 'John Doe'], (err) => {
    if (err) {
      console.error('❌ Error updating user 1:', err.message);
    } else {
      console.log('✅ User 1 updated: john.doe@example.com');
    }
    
    // Update second user
    connection.query(updateUser2, ['jane.smith@example.com', 'Jane Smith'], (err) => {
      if (err) {
        console.error('❌ Error updating user 2:', err.message);
      } else {
        console.log('✅ User 2 updated: jane.smith@example.com');
      }
      
      console.log('\n🎉 Sample data fixed successfully!');
      console.log('📧 Available test accounts:');
      console.log('  - john.doe@example.com (John Doe)');
      console.log('  - jane.smith@example.com (Jane Smith)');
      
      connection.end();
    });
  });
});
