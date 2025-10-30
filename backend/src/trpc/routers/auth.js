const { initTRPC } = require('@trpc/server');
const { z } = require('zod');
const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const t = initTRPC.context().create();

const authRouter = t.router({
  register: t.procedure
    .input(z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      user_id_public: z.string().min(3).optional(),
      mobile_number: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const name = input.full_name;
      const email = input.email;
      const phone = input.mobile_number || '';
      const username = input.user_id_public || email.split('@')[0];
      const passwordHash = await bcrypt.hash(input.password, 10);
      
      const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
      if (existing.length) throw new Error('Email already registered');
      
      const [result] = await db.query(
        'INSERT INTO users (full_name, email, username, password_hash, wallet_balance, account_balance) VALUES (?, ?, ?, ?, 0.00, 0.00)',
        [name, email, username, passwordHash]
      );
      
      const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      
      // Store user info in token payload
      const [newUser] = await db.query('SELECT user_id, full_name, email FROM users WHERE user_id = ?', [result.insertId]);
      
      return { token, user: { user_id: newUser[0].user_id, name: newUser[0].full_name, email: newUser[0].email } };
    }),

  login: t.procedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const [rows] = await db.query('SELECT user_id, email, password_hash, full_name FROM users WHERE email = ?', [input.email]);
      if (!rows.length) throw new Error('Invalid credentials');
      const user = rows[0];
      const ok = await bcrypt.compare(input.password, user.password_hash || '');
      if (!ok) throw new Error('Invalid credentials');
      
      const token = jwt.sign({ id: user.user_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      
      return { token, user: { user_id: user.user_id, name: user.full_name, email: user.email } };
    }),
});

module.exports = { authRouter, t };
