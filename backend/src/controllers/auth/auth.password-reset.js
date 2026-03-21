import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../../models/user.model.js";
import { transporter } from "../../config/email.js";
import { pool } from "../../config/db.js";
import { logAuth, logError } from "../../utils/logger.js";
import { validatePassword } from "../../utils/passwordValidator.js";
import { setRefreshCookie, setAccessCookie } from "../../utils/authCookies.js";
import { invalidateUserAuthCache } from "../../utils/userAuthCache.js";
import { createAccessToken, createRefreshToken, toSafeUser } from "./auth.shared.js";

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

    const link = `${process.env.FRONTEND_URL}/reset-password#token=${encodeURIComponent(resetToken)}`;

    await transporter.sendMail({
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Reset your password – InvParser",
      html: `
        <p>Hello ${user.name || "there"},</p>
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

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ message: pwCheck.message });
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

    await User.incrementRefreshTokenVersion(user.id);
    invalidateUserAuthCache(user.id);

    const freshUser = await User.findById(user.id);
    const accessToken = createAccessToken(freshUser);
    const refreshToken = createRefreshToken(freshUser);
    setRefreshCookie(res, refreshToken);
    setAccessCookie(res, accessToken);

    logAuth("password_reset_completed", { userId: user.id, email: user.email });

    return res.json({
      user: toSafeUser(user),
    });
  } catch (err) {
    logError(err, { operation: "resetPassword" });
    return res.status(500).json({ message: err.message });
  }
};
