import express from "express";
import {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  uploadAvatar as uploadAvatarController,
  getAvatar,
  sendVerificationEmail,
  verify,
  googleAuth,
  googleCallback,
  logout,
  forgotPassword,
  resetPassword,
  refresh,
} from "../controllers/auth.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimiter.middleware.js";
import { uploadAvatar } from "../middlewares/upload.middleware.js";

const router = express.Router();

// TRADIZIONALE (con rate limiting per brute force protection)
router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/me", protect, me);
router.get("/avatar", protect, getAvatar);
router.patch("/profile", protect, updateProfile);
router.post(
  "/profile/avatar",
  protect,
  (req, res, next) => {
    uploadAvatar.single("avatar")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err.message || "File non valido. Usa JPEG, PNG o WebP (max 2MB).",
        });
      }
      next();
    });
  },
  uploadAvatarController
);
router.post("/change-password", protect, changePassword);

// EMAIL VERIFY
router.post("/send-verification", protect, sendVerificationEmail);
router.get("/verify/:token", verify);

// GOOGLE OAUTH
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

router.post("/logout", logout);

router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password/:token", authRateLimiter, resetPassword);
router.post("/refresh", refresh);

export default router;
