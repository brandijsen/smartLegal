import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { User } from "../models/user.model.js";
import { transporter } from "../config/email.js";
import {
  sendProfileUpdatedEmail,
  sendPasswordChangedEmail,
  sendDeleteAccountEmail,
} from "../services/email.service.js";
import { pool } from "../config/db.js";
import { getUploadDir, getFilePath } from "../config/upload.js";
import { OAuth2Client } from "google-auth-library";
import { logAuth, logError } from "../utils/logger.js";
import { getRequestLogger } from "../middlewares/logger.middleware.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ───────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────
const toSafeUser = (u) => {
  const safe = {
    id: u.id,
    name: u.name,
    email: u.email,
    verified: u.verified,
  };
  if (u.avatar_path && process.env.BASE_URL) {
    safe.avatar_url = `${process.env.BASE_URL}/api/auth/avatar`;
  }
  return safe;
};

// ───────────────────────────────────────────────
// TOKEN HELPERS
// ───────────────────────────────────────────────
const createAccessToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "15m" });

const createRefreshToken = (user) =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );

const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  let crossOrigin = false;
  try {
    const frontUrl = process.env.FRONTEND_URL || "";
    const baseUrl = process.env.BASE_URL || "";
    crossOrigin = isProd && frontUrl && baseUrl &&
      new URL(frontUrl).origin !== new URL(baseUrl).origin;
  } catch (_) {}
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: crossOrigin ? "none" : "lax",
    secure: isProd || crossOrigin,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// ───────────────────────────────────────────────
// REGISTER (NO refresh token)
// ───────────────────────────────────────────────
const MIN_PASSWORD_LENGTH = 6;

export const register = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const { name, email, password } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const exists = await User.findByEmail(trimmedEmail);
    if (exists) {
      log.warn("Registration attempted with existing email", { email });
      return res.status(400).json({ message: "Email already used" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: trimmedEmail,
      password: hashed,
    });

    const accessToken = createAccessToken(user);

    logAuth("user_registered", { userId: user.id, email: user.email });

    return res.json({
      accessToken,
      user: toSafeUser({ ...user, verified: 0 }),
    });
  } catch (err) {
    logError(err, { operation: "register", email: req.body?.email });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// LOGIN
// ───────────────────────────────────────────────
export const login = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      log.warn("Login attempted with non-existent email", { email });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      log.warn("Login attempted with wrong password", { email, userId: user.id });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    setRefreshCookie(res, refreshToken);

    logAuth("user_logged_in", { userId: user.id, email: user.email });

    return res.json({
      accessToken,
      user: toSafeUser(user),
    });
  } catch (err) {
    logError(err, { operation: "login", email: req.body?.email });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// REFRESH
// ───────────────────────────────────────────────
export const refresh = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      log.warn("Token refresh attempted without refresh token");
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      log.warn("Token refresh attempted with invalid user", { userId: decoded.id });
      return res.status(401).json({ message: "User not found" });
    }

    const accessToken = createAccessToken(user);
    
    logAuth("token_refreshed", { userId: user.id });
    
    return res.json({ accessToken });
  } catch (err) {
    logError(err, { operation: "refresh" });
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

// ───────────────────────────────────────────────
// GET ME
// ───────────────────────────────────────────────
export const me = async (req, res) => {
  return res.json(toSafeUser(req.user));
};

// ───────────────────────────────────────────────
// UPDATE PROFILE
// ───────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail !== req.user.email) {
      const existing = await User.findByEmail(trimmedEmail);
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    const oldName = req.user.name;
    const oldEmail = req.user.email;

    await User.updateProfile(userId, { name: name.trim(), email: trimmedEmail });
    const updated = await User.findById(userId);
    logAuth("profile_updated", { userId, email: trimmedEmail });

    // Notifica via email (inviare alla NUOVA email)
    const changes = [];
    if (name.trim() !== oldName) changes.push(`Name: ${oldName} → ${name.trim()}`);
    if (trimmedEmail !== oldEmail) changes.push(`Email: ${oldEmail} → ${trimmedEmail}`);
    sendProfileUpdatedEmail(
      trimmedEmail,
      name.trim(),
      changes.length ? changes.join("<br>") : null
    ).catch(() => {});

    return res.json(toSafeUser(updated));
  } catch (err) {
    logError(err, { operation: "updateProfile", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// CHANGE PASSWORD
// ───────────────────────────────────────────────
export const changePassword = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "You signed up with Google. Use forgot password to set one.",
      });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Current password is wrong" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hashed);

    logAuth("password_changed", { userId: user.id });

    sendPasswordChangedEmail(user.email, user.name).catch(() => {});

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    logError(err, { operation: "changePassword", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// EXPORT USER DATA (GDPR Art. 15)
// ───────────────────────────────────────────────
export const exportData = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    const userId = req.user.id;

    const [userRows] = await pool.execute(
      "SELECT id, name, email, verified, created_at FROM users WHERE id = ?",
      [userId]
    );
    const profile = userRows[0];
    if (!profile) return res.status(404).json({ message: "User not found" });

    const [docRows] = await pool.execute(
      `SELECT d.id, d.original_name, d.status, d.uploaded_at, d.processed_at, d.is_defective,
              dr.raw_text, dr.parsed_json, dr.manually_edited, dr.edited_at
       FROM documents d
       LEFT JOIN document_results dr ON d.id = dr.document_id
       WHERE d.user_id = ?
       ORDER BY d.uploaded_at DESC`,
      [userId]
    );

    const [supplierRows] = await pool.execute(
      "SELECT id, name, vat_number, address, email, created_at FROM suppliers WHERE user_id = ?",
      [userId]
    );

    const [tagRows] = await pool.execute(
      "SELECT id, name, color, created_at FROM tags WHERE user_id = ?",
      [userId]
    );

    const safeParsedJson = (val) => {
      if (val == null) return null;
      if (typeof val === "object") return val;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    const exportPayload = {
      exported_at: new Date().toISOString(),
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        verified: profile.verified,
        created_at: profile.created_at,
      },
      documents: docRows.map((d) => ({
        id: d.id,
        original_name: d.original_name,
        status: d.status,
        uploaded_at: d.uploaded_at,
        processed_at: d.processed_at,
        is_defective: d.is_defective,
        raw_text: d.raw_text,
        parsed_json: safeParsedJson(d.parsed_json),
        manually_edited: d.manually_edited,
        edited_at: d.edited_at,
      })),
      suppliers: supplierRows,
      tags: tagRows,
    };

    logAuth("data_exported", { userId });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="invparser-data-${userId}-${Date.now()}.json"`);
    return res.json(exportPayload);
  } catch (err) {
    logError(err, { operation: "exportData", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// DELETE ACCOUNT (GDPR Art. 17) – via link email per tutti
// ───────────────────────────────────────────────

/** Esegue la cancellazione fisica dell'account (helper condiviso) */
const performAccountDeletion = async (userId, userEmail, log) => {
  const uploadsDir = getUploadDir(userId);
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      try {
        fs.unlinkSync(getFilePath(userId, file));
      } catch (e) {
        log?.warn("Could not delete file", { file, error: e.message });
      }
    }
    try {
      fs.rmdirSync(uploadsDir);
    } catch (e) {
      log?.warn("Could not remove uploads dir", { error: e.message });
    }
  }
  await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
};

/** Richiesta eliminazione: genera token e invia email con link (tutti gli account) */
export const requestDeleteAccount = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    const user = req.user;
    const token = crypto.randomBytes(32).toString("hex");

    await User.setDeleteToken(user.id, token);

    const confirmLink = `${process.env.BASE_URL}/api/auth/confirm-delete/${token}`;
    await sendDeleteAccountEmail(user.email, user.name, confirmLink);

    logAuth("delete_account_requested", { userId: user.id, email: user.email });

    return res.json({
      message: "Ti abbiamo inviato un'email con un link per confermare l'eliminazione. Il link scade tra 24 ore.",
    });
  } catch (err) {
    logError(err, { operation: "requestDeleteAccount", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

/** Conferma eliminazione: valida token e cancella account (link nell'email) */
export const confirmDeleteAccount = async (req, res) => {
  const log = getRequestLogger(req);
  const successUrl = `${process.env.FRONTEND_URL}/account-deleted`;
  const errorUrl = `${process.env.FRONTEND_URL}/account-deleted?error=invalid`;

  try {
    const { token } = req.params;
    const user = await User.findByDeleteToken(token);

    if (!user) {
      logAuth("delete_account_failed", { reason: "invalid_or_expired_token" });
      return res.redirect(errorUrl);
    }

    await performAccountDeletion(user.id, user.email, log);

    logAuth("account_deleted", { userId: user.id, email: user.email });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.redirect(successUrl);
  } catch (err) {
    logError(err, { operation: "confirmDeleteAccount" });
    return res.redirect(errorUrl);
  }
};

// ───────────────────────────────────────────────
// UPLOAD AVATAR
// ───────────────────────────────────────────────
export const uploadAvatar = async (req, res) => {
  const log = getRequestLogger(req);
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nessun file caricato" });
    }

    const userId = req.user.id;
    const oldPath = req.user.avatar_path;
    const filename = req.file.filename;

    // Elimina vecchio avatar se esiste
    if (oldPath) {
      const oldFullPath = getFilePath(userId, oldPath);
      if (fs.existsSync(oldFullPath)) {
        fs.unlinkSync(oldFullPath);
      }
    }

    await User.updateAvatar(userId, filename);
    const updated = await User.findById(userId);

    logAuth("avatar_updated", { userId });

    return res.json(toSafeUser(updated));
  } catch (err) {
    logError(err, { operation: "uploadAvatar", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// GET AVATAR (serve image)
// ───────────────────────────────────────────────
export const getAvatar = async (req, res) => {
  try {
    const avatarPath = req.user?.avatar_path;
    if (!avatarPath) {
      return res.status(404).json({ message: "No avatar" });
    }

    const fullPath = getFilePath(req.user.id, avatarPath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "Avatar not found" });
    }

    const ext = path.extname(avatarPath).toLowerCase();
    const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
    res.type(types[ext] || "image/jpeg");
    res.sendFile(fullPath);
  } catch (err) {
    logError(err, { operation: "getAvatar", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// SEND VERIFICATION EMAIL
// ───────────────────────────────────────────────
export const sendVerificationEmail = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const user = req.user;

    if (user.verified) {
      log.warn("Verification email requested for already verified user", { userId: user.id });
      return res.status(400).json({ message: "Already verified" });
    }

    let token = user.verification_token;
    if (!token) {
      token = crypto.randomBytes(32).toString("hex");
      await User.updateVerificationToken(user.id, token);
    }

    const link = `${process.env.BASE_URL}/api/auth/verify/${token}`;

    await transporter.sendMail({
      to: user.email,
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      subject: "Verify your email – InvParser",
      html: `
        <p>Hello ${user.name || 'there'},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${link}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify your account</a></p>
        <p style="color: #64748b; font-size: 14px;">If you did not create an account, you can ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">InvParser – automated notification</p>
      `,
    });

    logAuth("verification_email_sent", { userId: user.id, email: user.email });

    return res.json({ message: "Verification email sent" });
  } catch (err) {
    logError(err, { operation: "sendVerificationEmail", userId: req.user?.id });
    return res.status(500).json({ message: err.message });
  }
};

// ───────────────────────────────────────────────
// VERIFY EMAIL
// ───────────────────────────────────────────────
export const verify = async (req, res) => {
  try {
    const { token } = req.params;

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE verification_token = ? LIMIT 1",
      [token]
    );

    const user = rows[0];
    if (!user) {
      logAuth("email_verification_failed", { reason: "invalid_token" });
      return res.redirect(`${process.env.FRONTEND_URL}/verify/error`);
    }

    await User.verifyUser(user.id);

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    logAuth("email_verified", { userId: user.id, email: user.email });

    return res.redirect(
      `${process.env.FRONTEND_URL}/verify/success?token=${accessToken}`
    );
  } catch (err) {
    logError(err, { operation: "verify", token: req.params?.token });
    return res.redirect(`${process.env.FRONTEND_URL}/verify/error`);
  }
};

// ───────────────────────────────────────────────
// GOOGLE AUTH
// ───────────────────────────────────────────────
export const googleAuth = async (req, res) => {
  const redirect = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile&access_type=offline&prompt=select_account`;
  return res.redirect(redirect);
};

export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await googleClient.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    });

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findByEmail(email);

    if (!user) {
      const fakePassword = crypto.randomBytes(32).toString("hex");
      const hashed = await bcrypt.hash(fakePassword, 10);

      user = await User.create({
        name,
        email,
        password: hashed,
        auth_provider: "google",
      });

      await User.verifyUser(user.id);
      
      logAuth("google_user_created", { userId: user.id, email });
    } else {
      try {
        await pool.execute(
          "UPDATE users SET auth_provider = 'google' WHERE id = ? AND (auth_provider IS NULL OR auth_provider = 'email')",
          [user.id]
        );
      } catch (e) {
        if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
      }
      user = await User.findById(user.id);
      logAuth("google_login", { userId: user.id, email });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    return res.redirect(
      `${process.env.GOOGLE_FRONTEND_REDIRECT}?token=${accessToken}`
    );
  } catch (err) {
    logError(err, { operation: "googleCallback" });
    return res.redirect(`${process.env.FRONTEND_URL}/?error=google`);
  }
};

// ───────────────────────────────────────────────
// LOGOUT
// ───────────────────────────────────────────────
export const logout = async (req, res) => {
  logAuth("user_logged_out", { userId: req.user?.id });
  
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res.json({ message: "Logged out successfully" });
};

// ───────────────────────────────────────────────
// FORGOT / RESET PASSWORD
// ───────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      logAuth("password_reset_requested_invalid_email", { email });
      return res.json({ message: "If the email exists, a reset link was sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    await pool.execute(
      "UPDATE users SET reset_token = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?",
      [resetToken, user.id]
    );

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Reset your password – InvParser",
      html: `
        <p>Hello ${user.name || 'there'},</p>
        <p>You requested to reset your password. Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${link}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset your password</a></p>
        <p style="color: #64748b; font-size: 14px;">If you did not request this, ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">InvParser – automated notification</p>
      `,
    });

    logAuth("password_reset_email_sent", { userId: user.id, email });

    return res.json({ message: "If the email exists, a reset link was sent." });
  } catch (err) {
    logError(err, { operation: "forgotPassword", email: req.body?.email });
    return res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW() LIMIT 1",
      [token]
    );

    const user = rows[0];
    if (!user) {
      logAuth("password_reset_failed", { reason: "invalid_or_expired_token" });
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [hashed, user.id]
    );

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    logAuth("password_reset_completed", { userId: user.id, email: user.email });

    return res.json({
      accessToken,
      user: toSafeUser(user),
    });
  } catch (err) {
    logError(err, { operation: "resetPassword" });
    return res.status(500).json({ message: err.message });
  }
};
