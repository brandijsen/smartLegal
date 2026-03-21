import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import {
  JWT_SIGN_OPTIONS_ACCESS,
  JWT_SIGN_OPTIONS_REFRESH,
} from "../../utils/jwtConstants.js";

export const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function toSafeUser(u) {
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
}

export function createAccessToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, JWT_SIGN_OPTIONS_ACCESS);
}

export function createRefreshToken(user) {
  const v = Number(user?.refresh_token_version ?? 0) || 0;
  return jwt.sign({ id: user.id, v }, process.env.JWT_REFRESH_SECRET, JWT_SIGN_OPTIONS_REFRESH);
}
