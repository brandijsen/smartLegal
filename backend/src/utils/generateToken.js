import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  console.log("ACCESS SECRET:", process.env.JWT_SECRET);
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (user) => {
  console.log("REFRESH SECRET:", process.env.JWT_REFRESH_SECRET);
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

