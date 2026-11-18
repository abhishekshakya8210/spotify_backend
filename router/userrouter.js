import express from "express";
import login, { register, getProfile } from "../controller/usercontroller.js";
import { verifyToken } from "../middleware/authfarify.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", verifyToken, getProfile);

export default router;
