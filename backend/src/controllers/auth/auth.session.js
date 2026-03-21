import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../../models/user.model.js";
import { logAuth, logError } from "../../utils/logger.js";
import { getRequestLogger } from "../../middlewares/logger.middleware.js";
import {
  setRefreshCookie,
  setAccessCookie,
  clearAuthCookies,
} from "../../utils/authCookies.js";
import { JWT_VERIFY_OPTIONS } from "../../utils/jwtConstants.js";
import {
  revokeRefreshToken,
  isRefreshTokenRevokedWithRetry,
} from "../../utils/refreshTokenRevocation.js";
import { createAccessToken, createRefreshToken, toSafeUser } from "./auth.shared.js";

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
    setAccessCookie(res, accessToken);

    logAuth("user_logged_in", { userId: user.id, email: user.email });

    return res.json({
      user: toSafeUser(user),
    });
  } catch (err) {
    logError(err, { operation: "login", email: req.body?.email });
    return res.status(500).json({ message: err.message });
  }
};

export const refresh = async (req, res) => {
  const log = getRequestLogger(req);

  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      log.warn("Token refresh attempted without refresh token");
      return res.status(401).json({ message: "No refresh token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, JWT_VERIFY_OPTIONS);
    } catch {
      log.warn("Token refresh attempted with invalid JWT");
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (await isRefreshTokenRevokedWithRetry(token)) {
      log.warn("Token refresh attempted with revoked refresh token");
      return res.status(401).json({ message: "Session ended" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      log.warn("Token refresh attempted with invalid user", { userId: decoded.id });
      return res.status(401).json({ message: "User not found" });
    }

    const tokenVersion = Number(decoded.v ?? 0) || 0;
    const userVersion = Number(user.refresh_token_version ?? 0) || 0;
    if (tokenVersion !== userVersion) {
      log.warn("Token refresh attempted with stale session version", { userId: user.id });
      return res.status(401).json({ message: "Session ended" });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const ttl = Math.max(1, decoded.exp - nowSec);
    await revokeRefreshToken(token, ttl);

    const accessToken = createAccessToken(user);
    const newRefresh = createRefreshToken(user);
    setRefreshCookie(res, newRefresh);
    setAccessCookie(res, accessToken);

    logAuth("token_refreshed", { userId: user.id });

    return res.json({ ok: true });
  } catch (err) {
    logError(err, { operation: "refresh" });
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const me = async (req, res) => {
  return res.json(toSafeUser(req.user));
};

export const logout = async (req, res) => {
  const refresh = req.cookies?.refreshToken;
  if (refresh) {
    try {
      const decoded = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET, JWT_VERIFY_OPTIONS);
      const nowSec = Math.floor(Date.now() / 1000);
      const ttl = Math.max(1, decoded.exp - nowSec);
      await revokeRefreshToken(refresh, ttl);
    } catch {
      /* invalid or expired refresh — still clear cookies */
    }
  }

  logAuth("user_logged_out", { userId: req.user?.id });

  clearAuthCookies(res);

  return res.json({ message: "Logged out successfully" });
};
