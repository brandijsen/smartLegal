import { pool } from "../config/db.js";

export const User = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0];
  },

  async create({ name, email, password, auth_provider = "email" }) {
    try {
      const [res] = await pool.execute(
        "INSERT INTO users (name, email, password, auth_provider) VALUES (?, ?, ?, ?)",
        [name, email, password, auth_provider]
      );
      return { id: res.insertId, name, email };
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR" && e.message?.includes("auth_provider")) {
        const [res] = await pool.execute(
          "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
          [name, email, password]
        );
        return { id: res.insertId, name, email };
      }
      throw e;
    }
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
        "SELECT id, name, email, avatar_path, verified, verification_token, password, auth_provider, refresh_token_version FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      return rows[0];
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR") {
        const [rows] = await pool.execute(
          "SELECT id, name, email, verified, verification_token, password, auth_provider FROM users WHERE id = ? LIMIT 1",
          [id]
        );
        return { ...rows[0], auth_provider: "email", refresh_token_version: 0 };
      }
      throw e;
    }
  },

  async incrementRefreshTokenVersion(id) {
    try {
      await pool.execute(
        "UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = ?",
        [id]
      );
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR") return;
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

  async updateAuthProvider(id, provider) {
    try {
      await pool.execute("UPDATE users SET auth_provider = ? WHERE id = ?", [
        provider,
        id,
      ]);
    } catch (e) {
      if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
    }
  },

  async setDeleteToken(id, token) {
    const [res] = await pool.execute(
      "UPDATE users SET delete_token = ?, delete_token_expiry = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?",
      [token, id]
    );
    if (res.affectedRows === 0) {
      throw new Error("User not found");
    }
  },

  async findByDeleteToken(token) {
    try {
      const [rows] = await pool.execute(
        "SELECT id, name, email FROM users WHERE delete_token = ? AND delete_token_expiry > NOW() LIMIT 1",
        [token]
      );
      return rows[0];
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR") return null;
      throw e;
    }
  },

  async clearDeleteToken(id) {
    try {
      await pool.execute(
        "UPDATE users SET delete_token = NULL, delete_token_expiry = NULL WHERE id = ?",
        [id]
      );
    } catch (e) {
      if (e.code === "ER_BAD_FIELD_ERROR") return;
      throw e;
    }
  },
};
