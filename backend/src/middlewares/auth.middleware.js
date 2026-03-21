import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { getCachedUser, setCachedUser } from "../utils/userAuthCache.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    let token = null;
    if (header?.startsWith("Bearer ")) {
      token = header.split(" ")[1];
    }
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const uid = decoded.id;

    let user = getCachedUser(uid);
    if (!user) {
      user = await User.findById(uid);
      if (!user) return res.status(401).json({ message: "User not found" });
      setCachedUser(uid, user);
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
