import express from "express";
import createArtist, {
    uploadArtistMedia,
    uploadSongFiles,
    getAllArtists,
    getArtistById,
    addSongsToArtist
} from "../controller/artistcontroller.js";
import { verifyToken, checkRole } from "../middleware/authfarify.js";

const router = express.Router();

// Create artist: upload artist image + song files (audio) to ImageKit
router.post("/artist", verifyToken, checkRole("artist", "admin"), uploadArtistMedia, createArtist);

// Add song files (audio) to an existing artist
router.post("/artist/:id/songs", verifyToken, checkRole("artist", "admin"), uploadSongFiles, addSongsToArtist);

// Users (user, artist, admin) can view artists
router.get("/artist", verifyToken, checkRole("user", "artist", "admin"), getAllArtists);
router.get("/artist/:id", verifyToken, checkRole("user", "artist", "admin"), getArtistById);

export default router;
