import { pool } from "../config/db.js";

export const User = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0];
  },

  async findByVerificationToken(token) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE verification_token = ? LIMIT 1",
      [token]
    );
    return rows[0];
  },

  async create({ name, email, password, role, verification_token }) {
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, role, verification_token)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, password, role, verification_token]
    );

    return {
      id: result.insertId,
      name,
      email,
      role,
      verification_token,
    };
  },

  async verifyUser(id) {
    await pool.execute(
      `UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?`,
      [id]
    );
  },
};
