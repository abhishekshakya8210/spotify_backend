import express from "express";
import createArtist, { upload, getAllArtists, getArtistById } from "../controller/artistcontroller.js";
import { verifyToken, checkRole } from "../middleware/authfarify.js";

const router = express.Router();

// Only artist and admin can create an artist
router.post("/artist", verifyToken, checkRole("artist", "admin"), upload.single("image"), createArtist);

// Users (user, artist, admin) can view artists
router.get("/artist", verifyToken, checkRole("user", "artist", "admin"), getAllArtists);
router.get("/artist/:id", verifyToken, checkRole("user", "artist", "admin"), getArtistById);

export default router;
