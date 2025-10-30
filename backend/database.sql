-- Create database
CREATE DATABASE IF NOT EXISTS payment_history_db;
USE payment_history_db;

-- ===============================
-- MAIN ENTITIES FROM ER DIAGRAM
-- ===============================

-- Users table (Central entity)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    reset_token VARCHAR(100),
    reset_expires_at DATETIME,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Wallet table (User has Wallet - 1:1 relationship)
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    wallet_balance DECIMAL(12,2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_wallet (user_id)
);

-- Account table (User owns Account - 1:M relationship)
CREATE TABLE IF NOT EXISTS accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    bank_type ENUM('Savings', 'Current', 'Credit') NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    balance DECIMAL(12,2) DEFAULT 0.00,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_accounts (user_id)
);

-- Services table (Available services for categorization)
CREATE TABLE IF NOT EXISTS services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_description TEXT,
    category ENUM('Utility', 'Entertainment', 'Transport', 'Food', 'Shopping', 'Healthcare', 'Education', 'Other') DEFAULT 'Other',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills table (Bills that users can pay)
CREATE TABLE IF NOT EXISTS bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    bill_type ENUM('Electricity', 'Water', 'Gas', 'Internet', 'Mobile', 'DTH', 'Insurance', 'Loan', 'Credit Card', 'Other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('Pending', 'Paid', 'Overdue', 'Cancelled') DEFAULT 'Pending',
    transaction_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_bills (user_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
);

-- Transactions table (Central transaction entity)
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_type ENUM('Payment', 'Transfer', 'Deposit', 'Withdrawal', 'Bill Payment', 'Refund') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('Wallet', 'Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cash') NOT NULL,
    status ENUM('Pending', 'Success', 'Failed', 'Cancelled') DEFAULT 'Pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    reference_number VARCHAR(50) UNIQUE,
    from_account VARCHAR(50),
    to_account VARCHAR(50),
    service_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE SET NULL,
    INDEX idx_user_transactions (user_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_status_trans (status),
    INDEX idx_reference (reference_number)
);

-- History table (Derived from transactions for audit trail)
CREATE TABLE IF NOT EXISTS transaction_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    user_id INT NOT NULL,
    action_type ENUM('Created', 'Updated', 'Cancelled', 'Refunded') NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_amount DECIMAL(12,2),
    new_amount DECIMAL(12,2),
    derived_from_transactions TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by INT,
    notes TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_transaction_history (transaction_id),
    INDEX idx_user_history (user_id)
);

-- Add foreign key to bills table for transaction reference
ALTER TABLE bills ADD FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL;

-- ===============================
-- TRIGGERS FOR AUTOMATION
-- ===============================

-- Trigger to create wallet when user is created
DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_create_user_wallet
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO wallets (user_id, wallet_balance) VALUES (NEW.user_id, 0.00);
END //
DELIMITER ;

-- Trigger to log transaction history on transaction changes
DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_transaction_history_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO transaction_history (transaction_id, user_id, action_type, new_status, new_amount, derived_from_transactions)
    VALUES (NEW.transaction_id, NEW.user_id, 'Created', NEW.status, NEW.amount, 
           CONCAT('Transaction created: ', NEW.transaction_type, ' for amount ', NEW.amount));
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_transaction_history_update
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO transaction_history (transaction_id, user_id, action_type, old_status, new_status, old_amount, new_amount, derived_from_transactions)
    VALUES (NEW.transaction_id, NEW.user_id, 'Updated', OLD.status, NEW.status, OLD.amount, NEW.amount,
           CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
END //
DELIMITER ;

-- Trigger to update wallet balance on successful transactions
DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_update_wallet_balance
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'Success' AND OLD.status != 'Success' THEN
        IF NEW.payment_method = 'Wallet' THEN
            IF NEW.transaction_type IN ('Payment', 'Bill Payment', 'Transfer', 'Withdrawal') THEN
                -- Check if wallet has sufficient balance before deducting
                DECLARE current_balance DECIMAL(12,2);
                SELECT wallet_balance INTO current_balance FROM wallets WHERE user_id = NEW.user_id;
                
                IF current_balance >= NEW.amount THEN
                    UPDATE wallets SET wallet_balance = wallet_balance - NEW.amount WHERE user_id = NEW.user_id;
                ELSE
                    -- If insufficient balance, update transaction status to Failed
                    UPDATE transactions SET status = 'Failed', description = CONCAT(description, ' - Failed due to insufficient wallet balance') 
                    WHERE transaction_id = NEW.transaction_id;
                    
                    -- Signal the application about the failure
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient wallet balance';
                END IF;
            ELSEIF NEW.transaction_type IN ('Deposit', 'Refund') THEN
                UPDATE wallets SET wallet_balance = wallet_balance + NEW.amount WHERE user_id = NEW.user_id;
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;

-- Trigger to update bill status when payment is made
DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_update_bill_status
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'Success' AND NEW.transaction_type = 'Bill Payment' THEN
        UPDATE bills SET status = 'Paid', transaction_id = NEW.transaction_id 
        WHERE user_id = NEW.user_id AND amount = NEW.amount AND status = 'Pending'
        ORDER BY due_date ASC LIMIT 1;
    END IF;
END //
DELIMITER ;

-- Password reset audit trigger
DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_password_reset_audit
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.password <> OLD.password THEN
        INSERT INTO transaction_history (transaction_id, user_id, action_type, derived_from_transactions)
        VALUES (0, NEW.user_id, 'Updated', 'Password reset performed');
    END IF;
END //
DELIMITER ;

-- ===============================
-- SAMPLE DATA WITH RELATIONSHIPS
-- ===============================

-- Insert sample users
INSERT INTO users (email, password, phone_number, name) VALUES 
('john.doe@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9876543210', 'John Doe'),
('jane.smith@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '8765432109', 'Jane Smith'),
('alice.johnson@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '7654321098', 'Alice Johnson')
ON DUPLICATE KEY UPDATE email = email;

-- Insert sample accounts
INSERT INTO accounts (user_id, account_number, bank_name, bank_type, ifsc_code, balance, is_primary) VALUES 
(1, '1234567890123456', 'State Bank of India', 'Savings', 'SBIN0001234', 25000.00, TRUE),
(1, '6543210987654321', 'HDFC Bank', 'Current', 'HDFC0002345', 15000.00, FALSE),
(2, '9876543210987654', 'ICICI Bank', 'Savings', 'ICIC0003456', 30000.00, TRUE),
(3, '1111222233334444', 'Axis Bank', 'Savings', 'UTIB0004567', 18000.00, TRUE)
ON DUPLICATE KEY UPDATE account_number = account_number;

-- Insert sample services
INSERT INTO services (service_name, service_description, category) VALUES 
('Electricity Bill', 'State electricity board bill payment', 'Utility'),
('Mobile Recharge', 'Mobile phone recharge service', 'Utility'),
('DTH Recharge', 'Direct to home TV recharge', 'Entertainment'),
('Internet Bill', 'Broadband internet bill payment', 'Utility'),
('Water Bill', 'Municipal water bill payment', 'Utility'),
('Gas Bill', 'LPG gas cylinder booking and payment', 'Utility'),
('Food Delivery', 'Online food order payment', 'Food'),
('Online Shopping', 'E-commerce purchase payment', 'Shopping')
ON DUPLICATE KEY UPDATE service_name = service_name;

-- Insert sample bills
INSERT INTO bills (user_id, provider_name, bill_type, amount, due_date, status) VALUES 
(1, 'BESCOM', 'Electricity', 1250.00, '2024-02-15', 'Pending'),
(1, 'Airtel', 'Mobile', 599.00, '2024-02-10', 'Pending'),
(1, 'Tata Sky', 'DTH', 350.00, '2024-02-20', 'Pending'),
(2, 'BWSSB', 'Water', 800.00, '2024-02-12', 'Pending'),
(2, 'Jio Fiber', 'Internet', 999.00, '2024-02-18', 'Pending'),
(3, 'IndusInd Credit Card', 'Credit Card', 5500.00, '2024-02-25', 'Pending')
ON DUPLICATE KEY UPDATE bill_id = bill_id;

-- Insert sample transactions
INSERT INTO transactions (user_id, transaction_type, amount, payment_method, status, description, reference_number, service_id) VALUES 
(1, 'Deposit', 5000.00, 'Bank Transfer', 'Success', 'Wallet top-up from SBI account', 'TXN1001', NULL),
(1, 'Bill Payment', 1250.00, 'Wallet', 'Success', 'BESCOM electricity bill payment', 'TXN1002', 1),
(2, 'Payment', 250.00, 'UPI', 'Success', 'Food delivery payment', 'TXN1003', 7),
(2, 'Transfer', 1000.00, 'Bank Transfer', 'Success', 'Money transfer to friend', 'TXN1004', NULL),
(3, 'Deposit', 2000.00, 'Debit Card', 'Success', 'Wallet recharge', 'TXN1005', NULL)
ON DUPLICATE KEY UPDATE reference_number = reference_number;

-- Update wallet balances based on transactions
UPDATE wallets SET wallet_balance = 3750.00 WHERE user_id = 1;  -- 5000 - 1250
UPDATE wallets SET wallet_balance = 0.00 WHERE user_id = 2;     -- No wallet transactions
UPDATE wallets SET wallet_balance = 2000.00 WHERE user_id = 3;  -- 2000 deposit
