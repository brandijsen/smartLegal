import { pool } from "../config/db.js";

export const User = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0];
  },

  async create({ name, email, password }) {
    const [res] = await pool.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, password]
    );

    return { id: res.insertId, name, email };
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
    try {
      const [rows] = await pool.execute(
        "SELECT id, name, email, avatar_path, verified, verification_token, password FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      return rows[0];
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR" && e.message?.includes("avatar_path")) {
        const [rows] = await pool.execute(
          "SELECT id, name, email, verified, verification_token, password FROM users WHERE id = ? LIMIT 1",
          [id]
        );
        return rows[0];
      }
      throw e;
    }
  },

  async updateProfile(id, { name, email }) {
    await pool.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, id]
    );
  },

  async updatePassword(id, hashedPassword) {
    await pool.execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      id,
    ]);
  },

  async updateAvatar(id, avatarPath) {
    await pool.execute("UPDATE users SET avatar_path = ? WHERE id = ?", [
      avatarPath,
      id,
    ]);
  },
};
