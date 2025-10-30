const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('Testing database connection...');
console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD || '(empty)');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    return;
  }
  
  console.log('✅ Connected to MySQL successfully!');
  
  // Test if database exists
  connection.query('SHOW DATABASES', (err, results) => {
    if (err) {
      console.error('❌ Error showing databases:', err.message);
    } else {
      console.log('📊 Available databases:');
      results.forEach(row => {
        console.log('  -', row.Database_name);
      });
    }
    
    connection.end();
  });
});
