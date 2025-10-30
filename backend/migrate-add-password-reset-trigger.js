const mysql = require('mysql2/promise');

(async () => {
  console.log('🔧 Adding password reset audit table and trigger...');
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'payment_history_db'
  });

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_audit (
        audit_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        method VARCHAR(50) DEFAULT 'email_phone',
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Drop existing trigger if present (MySQL lacks IF NOT EXISTS for triggers across versions)
    try { await conn.execute('DROP TRIGGER IF EXISTS trg_password_reset_audit'); } catch {}

    await conn.query(`
      DELIMITER //
      CREATE TRIGGER trg_password_reset_audit
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        IF NEW.password_hash <> OLD.password_hash THEN
          INSERT INTO password_reset_audit (user_id, method) VALUES (NEW.user_id, 'email_phone');
        END IF;
      END //
      DELIMITER ;
    `);

    console.log('✅ Password reset audit/trigger ready.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
  } finally {
    await conn.end();
  }
})();

