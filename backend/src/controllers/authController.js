const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Hash password with bcrypt
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// User Registration
exports.registerUser = async (req, res) => {
  try {
    // Extract all possible field variations
    const { 
      email, 
      password, 
      full_name, 
      name, 
      mobile_number, 
      phone_number, 
      user_id_public 
    } = req.body;

    // Handle both old and new field names
    const userName = full_name || name;
    const userEmail = email;
    const username = user_id_public || email; // Use user_id_public or email as username

    // Log for debugging
    console.log('Registration attempt:', { email: userEmail, userName, username, hasPassword: !!password });

    // Update validation to match current database schema (no phone required)
    if (!userEmail || !password || !userName || !username) {
      return res.status(400).json({ 
        message: 'All fields are required: name, email, username, password',
        received: { 
          email: !!userEmail, 
          password: !!password, 
          full_name: !!userName, 
          username: !!username 
        }
      });
    }

    // Basic validation
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long.' 
      });
    }

    if (!/\S+@\S+\.\S+/.test(userEmail)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address.' 
      });
    }

    // Username validation (basic)
    if (username.length < 3) {
      return res.status(400).json({ 
        message: 'Username must be at least 3 characters long.' 
      });
    }
    // Check if email already exists
    const [existingEmail] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [userEmail]
    );
    
    if (existingEmail.length > 0) {
      return res.status(400).json({ 
        message: 'Email already exists. Please use a different email.' 
      });
    }

    // Check if username already exists
    const [existingUsername] = await db.query(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );
    if (existingUsername.length > 0) {
      return res.status(400).json({ 
        message: 'Username already in use. Please choose a different username.' 
      });
    }


    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user with existing database schema
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, full_name, email, wallet_balance, account_balance) VALUES (?, ?, ?, ?, 0.00, 0.00)',
      [username, passwordHash, userName, userEmail]
    );

    res.status(201).json({
      message: 'User registered successfully! You can now login.',
      user_id: result.insertId,
      username,
      email: userEmail,
      full_name: userName
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error during registration', 
      error: error.message 
    });
  }
};

// User Login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Email and password are required.' 
    });
  }

  try {
    // Find user by email (with existing database schema)
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        message: 'Invalid email or password.' 
      });
    }

    const user = users[0];

    // Check password (use password_hash field from existing schema)
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password.' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.user_id, 
        email: user.email,
        name: user.full_name,
        username: user.username
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        name: user.full_name,
        profile_image: user.profile_image,
        is_active: user.is_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error during login', 
      error: error.message 
    });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const [users] = await db.query(
      'SELECT user_id, name, email, phone_number, profile_image, is_active, date_created FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      user: users[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Error fetching profile', 
      error: error.message 
    });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  // Basic validation
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ 
      message: 'Please enter a valid email address.' 
    });
  }

  try {
    // Check if the new email is already in use by another user
    if (email) {
      const [existingUsers] = await db.query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, userId]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ 
          message: 'Email is already in use by another account.' 
        });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateValues.push(userId);

    const [result] = await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'Profile updated successfully!',
      updated: { name, email }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ 
      message: 'Current password and new password are required.' 
    });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ 
      message: 'New password must be at least 6 characters long.' 
    });
  }

  try {
    // Get current user
    const [users] = await db.query(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(current_password, users[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        message: 'Current password is incorrect.' 
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [newPasswordHash, userId]
    );

    res.status(200).json({
      message: 'Password changed successfully!'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Error changing password', 
      error: error.message 
    });
  }
};

// Update Profile Image
exports.updateProfileImage = async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  try {
    const imagePath = req.file.filename;

    const [result] = await db.query(
      'UPDATE users SET profile_image = ? WHERE user_id = ?',
      [imagePath, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'Profile image updated successfully!',
      profile_image: imagePath
    });

  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({ 
      message: 'Error updating profile image', 
      error: error.message 
    });
  }
};

// Forgot Password - Step 1: Verify email + phone, issue reset token
exports.forgotVerify = async (req, res) => {
  const { email, mobile_number, phone_number } = req.body;
  const phone = phone_number || mobile_number;
  if (!email || !phone) {
    return res.status(400).json({ message: 'Email and phone are required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT user_id FROM users WHERE email = ? AND phone_number = ?',
      [email, phone]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'No account found for the provided details.' });
    }

    const userId = users[0].user_id;
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.query(
      'UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE user_id = ?',
      [token, expiresAt, userId]
    );

    return res.status(200).json({ message: 'Verification successful. You can reset the password now.', token });
  } catch (error) {
    console.error('Forgot verify error:', error);
    return res.status(500).json({ message: 'Error verifying account', error: error.message });
  }
};

// Forgot Password - Step 2: Reset using token
exports.resetPasswordWithToken = async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    const [users] = await db.query(
      'SELECT user_id, reset_expires_at FROM users WHERE reset_token = ?',
      [token]
    );
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }
    const rec = users[0];
    if (!rec.reset_expires_at || new Date(rec.reset_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Reset token has expired. Please verify again.' });
    }

    const newHash = await hashPassword(new_password);
    await db.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE user_id = ?',
      [newHash, rec.user_id]
    );

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset by token error:', error);
    return res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const [users] = await db.query(
      'SELECT user_id, name, email, phone_number, profile_image, is_active, date_created FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      user: users[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Error fetching profile', 
      error: error.message 
    });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  // Basic validation
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ 
      message: 'Please enter a valid email address.' 
    });
  }

  try {
    // Check if the new email is already in use by another user
    if (email) {
      const [existingUsers] = await db.query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, userId]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ 
          message: 'Email is already in use by another account.' 
        });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateValues.push(userId);

    const [result] = await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'Profile updated successfully!',
      updated: { name, email }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ 
      message: 'Current password and new password are required.' 
    });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ 
      message: 'New password must be at least 6 characters long.' 
    });
  }

  try {
    // Get current user
    const [users] = await db.query(
      'SELECT password FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(current_password, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        message: 'Current password is incorrect.' 
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [newPasswordHash, userId]
    );

    res.status(200).json({
      message: 'Password changed successfully!'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Error changing password', 
      error: error.message 
    });
  }
};

// Update Profile Image
exports.updateProfileImage = async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  try {
    const imagePath = req.file.filename;

    const [result] = await db.query(
      'UPDATE users SET profile_image = ? WHERE user_id = ?',
      [imagePath, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'Profile image updated successfully!',
      profile_image: imagePath
    });

  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({ 
      message: 'Error updating profile image', 
      error: error.message 
    });
  }
};

// Forgot Password - Step 1: Verify email + phone, issue reset token
exports.forgotVerify = async (req, res) => {
  const { email, mobile_number } = req.body;
  if (!email || !mobile_number) {
    return res.status(400).json({ message: 'Email and phone are required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT user_id FROM users WHERE email = ? AND mobile_number = ?',
      [email, mobile_number]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'No account found for the provided details.' });
    }

    const userId = users[0].user_id;
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.query(
      'UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE user_id = ?',
      [token, expiresAt, userId]
    );

    return res.status(200).json({ message: 'Verification successful. You can reset the password now.', token });
  } catch (error) {
    console.error('Forgot verify error:', error);
    return res.status(500).json({ message: 'Error verifying account', error: error.message });
  }
};

// Forgot Password - Step 2: Reset using token
exports.resetPasswordWithToken = async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    const [users] = await db.query(
      'SELECT user_id, reset_expires_at FROM users WHERE reset_token = ?',
      [token]
    );
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }
    const rec = users[0];
    if (!rec.reset_expires_at || new Date(rec.reset_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Reset token has expired. Please verify again.' });
    }

    const newHash = await hashPassword(new_password);
    await db.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE user_id = ?',
      [newHash, rec.user_id]
    );

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset by token error:', error);
    return res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};
