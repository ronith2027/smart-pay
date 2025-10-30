const mysql = require('mysql2/promise');

(async () => {
  console.log('🔧 Migrating users table (adding missing columns)...');
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'payment_history_db'
  });

  try {
    const requiredColumns = [
      { name: 'email', type: 'VARCHAR(100) NULL' },
      { name: 'password_hash', type: 'VARCHAR(255) NULL' },
      { name: 'mobile_number', type: 'VARCHAR(15) NULL' },
      { name: 'user_id_public', type: 'VARCHAR(50) NULL' },
      { name: 'full_name', type: 'VARCHAR(100) NULL' },
      { name: 'profile_image', type: 'VARCHAR(255) NULL' },
      { name: 'is_verified', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'reset_token', type: 'VARCHAR(255) NULL' },
      { name: 'reset_expires_at', type: 'TIMESTAMP NULL' }
    ];

    const [rows] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      ['payment_history_db']
    );

    const existing = new Set(rows.map(r => r.COLUMN_NAME));

    for (const col of requiredColumns) {
      if (!existing.has(col.name)) {
        console.log(`➡️  Adding column ${col.name}...`);
        await connection.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`✔️  Column ${col.name} exists.`);
      }
    }

    // Add unique constraints where appropriate
    // mobile_number
    const uniqueChecks = [
      { name: 'mobile_number', constraint: 'users_mobile_number_unique' },
      { name: 'user_id_public', constraint: 'users_user_id_public_unique' },
      { name: 'email', constraint: 'users_email_unique' }
    ];

    for (const check of uniqueChecks) {
      const [uc] = await connection.execute(
        `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS \
         WHERE TABLE_SCHEMA=? AND TABLE_NAME='users' AND CONSTRAINT_TYPE='UNIQUE' AND CONSTRAINT_NAME=?`,
        ['payment_history_db', check.constraint]
      );
      if (uc.length === 0 && existing.has(check.name)) {
        try {
          console.log(`➡️  Adding unique constraint on ${check.name}...`);
          await connection.execute(`ALTER TABLE users ADD CONSTRAINT ${check.constraint} UNIQUE (${check.name})`);
        } catch (e) {
          console.log(`ℹ️  Skipped adding unique on ${check.name}: ${e.message}`);
        }
      }
    }

    console.log('✅ Migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await connection.end();
  }
})();
