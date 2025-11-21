import { authService } from "../services/authService.js";

export const authController = {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // 🔒 Basic required fields
      if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
      }

      // 🧼 Trim spaces
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      // 🔤 Name validation
      if (cleanName.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters." });
      }

      // 📧 Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      // 🔐 Password validation
      if (cleanPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }

      // 🚫 No spaces allowed in password
      if (cleanPassword.includes(" ")) {
        return res.status(400).json({ message: "Password cannot contain spaces." });
      }

      // ✔ Register via service
      const user = await authService.register(cleanName, cleanEmail, cleanPassword);

      res.status(201).json({
        message: "User created. Check your email to verify your account."
      });

    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },


  async login(req, res) {
    try {
      const { email, password } = req.body;

      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const { accessToken, refreshToken, user } = await authService.login(
        cleanEmail,
        cleanPassword
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ accessToken, user });

    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async verify(req, res) {
  try {
    const { token } = req.params;
    const user = await authService.verifyEmail(token);

    res.json({ message: "Email verified successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
};
