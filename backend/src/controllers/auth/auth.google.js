import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../../models/user.model.js";
import { pool } from "../../config/db.js";
import { logAuth, logError } from "../../utils/logger.js";
import {
  setRefreshCookie,
  setAccessCookie,
  setOAuthStateCookie,
  clearOAuthStateCookie,
} from "../../utils/authCookies.js";
import { googleClient, createAccessToken, createRefreshToken } from "./auth.shared.js";
import { invalidateUserAuthCache } from "../../utils/userAuthCache.js";

export const googleAuth = async (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  setOAuthStateCookie(res, state);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
};

export const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const expected = req.cookies?.oauth_state;
    clearOAuthStateCookie(res);

    if (!state || !expected || state !== expected) {
      logAuth("google_oauth_failed", { reason: "invalid_state" });
      return res.redirect(`${process.env.FRONTEND_URL}/?error=oauth_state`);
    }

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
      invalidateUserAuthCache(user.id);

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
    setAccessCookie(res, accessToken);

    return res.redirect(process.env.GOOGLE_FRONTEND_REDIRECT);
  } catch (err) {
    logError(err, { operation: "googleCallback" });
    return res.redirect(`${process.env.FRONTEND_URL}/?error=google`);
  }
};
