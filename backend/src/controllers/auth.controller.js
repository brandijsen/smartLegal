import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { transporter } from "../config/email.js";
import { pool } from "../config/db.js";
import { OAuth2Client } from "google-auth-library";
import { logAuth, logError } from "../utils/logger.js";
import { getRequestLogger } from "../middlewares/logger.middleware.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ───────────────────────────────────────────────
// TOKEN HELPERS
// ───────────────────────────────────────────────
const createAccessToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

const createRefreshToken = (user) =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// ───────────────────────────────────────────────
// REGISTER (NO refresh token)
// ───────────────────────────────────────────────
export const register = async (req, res) => {
  const log = getRequestLogger(req);
  
  try {
    const { name, email, password } = req.body;

    const exists = await User.findByEmail(email);
    if (exists) {
      log.warn("Registration attempted with existing email", { email });
      return res.status(400).json({ message: "Email already used" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "user",
      verification_token: null,
    });

    const accessToken = createAccessToken(user);

    logAuth("user_registered", { userId: user.id, email: user.email });

    return res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: 0,
      },
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
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
  return res.json(req.user);
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
      from: process.env.EMAIL_FROM,
      subject: "Verify your email",
      html: `<a href="${link}">Verify your account</a>`,
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
        role: "user",
        verification_token: null,
      });

      await User.verifyUser(user.id);
      
      logAuth("google_user_created", { userId: user.id, email });
    } else {
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
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google`);
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
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset your password",
      html: `<a href="${link}">Reset your password</a>`,
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
      user: { id: user.id, role: user.role },
    });
  } catch (err) {
    logError(err, { operation: "resetPassword" });
    return res.status(500).json({ message: err.message });
  }
};
