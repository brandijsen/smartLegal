import { pool } from "../config/db.js";

export const User = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0];
  },

  async create({ name, email, password, role }) {
    const [res] = await pool.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, password, role]
    );

    return { id: res.insertId, name, email, role };
  },

  async updateVerificationToken(id, token) {
    await pool.execute(
      "UPDATE users SET verification_token = ? WHERE id = ?",
      [token, id]
    );
  },

  async verifyUser(id) {
    await pool.execute(
      "UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?",
      [id]
    );
  },

  async findById(id) {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, verified, verification_token FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0];
  }
};
