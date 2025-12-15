import express from "express";
import {
  register,
  login,
  me,
  sendVerificationEmail,
  verify,
  googleAuth,
  googleCallback,
  logout,
  forgotPassword, resetPassword
} from "../controllers/auth.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// TRADIZIONALE
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);

// EMAIL VERIFY
router.post("/send-verification", protect, sendVerificationEmail);
router.get("/verify/:token", verify);

// GOOGLE OAUTH
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
