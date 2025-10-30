const db = require('../config/db');

async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, ddl) {
  const exists = await columnExists(table, column);
  if (!exists) {
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

async function ensureUsersSchema() {
  // Ensure columns used by the codebase exist
  await addColumnIfMissing('users', 'username', 'username VARCHAR(50) NULL');
  await addColumnIfMissing('users', 'full_name', 'full_name VARCHAR(100) NULL');
  await addColumnIfMissing('users', 'password_hash', 'password_hash VARCHAR(255) NULL');
  await addColumnIfMissing('users', 'wallet_balance', 'wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00');
  await addColumnIfMissing('users', 'account_balance', 'account_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00');

  // Migrate data from legacy columns if present
  const nameExists = await columnExists('users', 'name');
  const fullNameExists = await columnExists('users', 'full_name');
  if (nameExists && fullNameExists) {
    await db.query('UPDATE users SET full_name = COALESCE(full_name, name)');
  }

  const passExists = await columnExists('users', 'password');
  const passHashExists = await columnExists('users', 'password_hash');
  if (passExists && passHashExists) {
    await db.query('UPDATE users SET password_hash = COALESCE(password_hash, password)');
  }

  const usernameFilled = await db.query('SELECT COUNT(*) AS cnt FROM users WHERE username IS NULL OR username = ""');
  if (usernameFilled[0][0].cnt > 0) {
    // Default username from email prefix
    await db.query("UPDATE users SET username = CASE WHEN INSTR(email,'@')>0 THEN SUBSTRING(email,1,INSTR(email,'@')-1) ELSE email END WHERE username IS NULL OR username = ''");
  }
}

async function ensurePasswordResetTrigger() {
  // Drop old trigger if it references legacy column
  try {
    const [rows] = await db.query(
      `SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS 
       WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'trg_password_reset_audit'`
    );
    if (rows.length > 0) {
      await db.query('DROP TRIGGER IF EXISTS trg_password_reset_audit');
    }
  } catch {}
  
  // Recreate trigger against password_hash if transaction_history exists
  try {
    const [th] = await db.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_history'`
    );
    if (th[0].cnt > 0) {
      await db.query(`
        DELIMITER //
        CREATE TRIGGER trg_password_reset_audit
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          IF NEW.password_hash <> OLD.password_hash THEN
            INSERT INTO transaction_history (transaction_id, user_id, action_type, derived_from_transactions)
            VALUES (0, NEW.user_id, 'Updated', 'Password reset performed');
          END IF;
        END //
        DELIMITER ;
      `);
    }
  } catch (e) {
    // Some MySQL clients disallow DELIMITER via protocol; create using standard statements
    try {
      await db.query('DROP TRIGGER IF EXISTS trg_password_reset_audit');
      await db.query(`CREATE TRIGGER trg_password_reset_audit AFTER UPDATE ON users FOR EACH ROW 
        BEGIN 
          IF NEW.password_hash <> OLD.password_hash THEN 
            INSERT INTO transaction_history (transaction_id, user_id, action_type, derived_from_transactions) 
            VALUES (0, NEW.user_id, 'Updated', 'Password reset performed'); 
          END IF; 
        END`);
    } catch {}
  }
}

async function ensureSchema() {
  await ensureUsersSchema();
  await ensurePasswordResetTrigger();
}

module.exports = { ensureSchema };
