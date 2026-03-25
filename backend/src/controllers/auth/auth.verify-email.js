import crypto from "crypto";
import { User } from "../../models/user.model.js";
import { transporter } from "../../config/email.js";
import { pool } from "../../config/db.js";
import { logAuth, logError } from "../../utils/logger.js";
import { getRequestLogger } from "../../middlewares/logger.middleware.js";
import { setRefreshCookie, setAccessCookie } from "../../utils/authCookies.js";
import { createAccessToken, createRefreshToken } from "./auth.shared.js";
import { invalidateUserAuthCache } from "../../utils/userAuthCache.js";

async function verifyEmailTokenAndSetSession(token, res) {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE verification_token = ? LIMIT 1",
    [token]
  );

  const user = rows[0];
  if (!user) return false;

  await User.verifyUser(user.id);
  invalidateUserAuthCache(user.id);

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  setRefreshCookie(res, refreshToken);
  setAccessCookie(res, accessToken);

  logAuth("email_verified", { userId: user.id, email: user.email });

  return true;
}

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

    const link = `${process.env.FRONTEND_URL}/verify-email#token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      to: user.email,
      from: `"InvParser" <${process.env.EMAIL_FROM}>`,
      subject: "Verify your email – InvParser",
      html: `
        <p>Hello ${user.name || "there"},</p>
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

/** Legacy: GET link still supported for old emails. */
export const verify = async (req, res) => {
  try {
    const { token } = req.params;
    const ok = await verifyEmailTokenAndSetSession(token, res);
    if (!ok) {
      logAuth("email_verification_failed", { reason: "invalid_token" });
      return res.redirect(`${process.env.FRONTEND_URL}/verify/error`);
    }
    return res.redirect(`${process.env.FRONTEND_URL}/verify/success`);
  } catch (err) {
    logError(err, { operation: "verify" });
    return res.redirect(`${process.env.FRONTEND_URL}/verify/error`);
  }
};

/** Preferred: token in body (avoids leaking token via Referer on frontend loads). */
export const verifyEmailFromBody = async (req, res) => {
  try {
    const raw = req.body?.token;
    const token = typeof raw === "string" ? raw.trim() : "";
    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    const ok = await verifyEmailTokenAndSetSession(token, res);
    if (!ok) {
      logAuth("email_verification_failed", { reason: "invalid_token" });
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    return res.json({ ok: true });
  } catch (err) {
    logError(err, { operation: "verifyEmailFromBody" });
    return res.status(500).json({ message: "Verification failed" });
  }
};
