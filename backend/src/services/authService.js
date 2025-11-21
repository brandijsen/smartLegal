import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { transporter } from "../config/email.js";

export const authService = {
  async register(name, email, password) {
    const existingUser = await User.findByEmail(email);
    if (existingUser) throw new Error("Email already in use");

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      verification_token: verificationToken,
    });

    await transporter.sendMail({
from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify your SmartLegal account",
      html: `<p>Click the link below to verify your email:</p>
             <a href="${process.env.BASE_URL}/auth/verify/${verificationToken}">
               Verify Account
             </a>`
    });

    return user;
  },

  async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    if (!user.verified) throw new Error("Email not verified");

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return { accessToken, refreshToken, user };
  },

  async verifyEmail(token) {
  const user = await User.findByVerificationToken(token);
  if (!user) throw new Error("Invalid or expired verification token.");

  await User.verifyUser(user.id);

  return user;
}
};
