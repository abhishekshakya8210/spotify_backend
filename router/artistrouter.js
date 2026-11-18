import express from "express";
import createArtist, { upload } from "../controller/artistcontroller.js";
import { verifyToken } from "../middleware/authfarify.js";

const router = express.Router();
router.post("/artist", verifyToken, upload.single("image"), createArtist);

export default router;
