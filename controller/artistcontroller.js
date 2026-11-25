import dotenv from "dotenv";
import multer from "multer";
import ImageKit from "imagekit";
import Artist from "../model/artistmodel.js";

dotenv.config();

// Multer configuration (stores uploaded files in memory buffer)
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        if (file.fieldname === "image") {
            if (file.mimetype.startsWith("image/")) {
                cb(null, true);
            } else {
                cb(new Error("Only image files are allowed for image"), false);
            }
        } else if (file.fieldname === "songs" || file.fieldname === "audio") {
            cb(null, true); // allow audio files
        } else {
            cb(null, true);
        }
    },
});

// Multer fields: 1 image + up to 10 song files
export const uploadArtistMedia = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "songs", maxCount: 10 },
]);

// Multer array for adding multiple song files
export const uploadSongFiles = upload.array("songs", 10);

// Initialize ImageKit using credentials from .env
const getImageKit = () => {
    return new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY?.trim(),
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY?.trim(),
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT?.trim(),
    });
};

// Helper to parse songs input when passed as text or JSON
export const parseSongs = (songsInput) => {
    if (!songsInput) return [];

    let parsed = songsInput;

    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            if (parsed.includes(",")) {
                parsed = parsed.split(",").map(s => s.trim()).filter(Boolean);
            } else {
                parsed = [parsed.trim()];
            }
        }
    }

    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed.map((item) => {
        if (typeof item === "string") {
            return { title: item.trim() };
        }
        if (typeof item === "object" && item !== null) {
            return {
                title: item.title || item.name || "Untitled Song",
                url: item.url || item.audio || item.audioUrl || "",
                duration: item.duration || "",
            };
        }
        return { title: String(item).trim() };
    }).filter(s => s.title && s.title.length > 0);
};

export const createArtist = async (req, res) => {
    try {
        const { name, bio, genre, followers, monthlyListeners, verified, songTitles } = req.body || {};

        if (!name) {
            return res.status(400).json({
                status: false,
                message: "Name is required",
            });
        }

        const imageFile = req.files?.["image"]?.[0] || req.file;

        if (!imageFile) {
            return res.status(400).json({
                status: false,
                message: "Artist image file is required",
            });
        }

        const imagekit = getImageKit();

        // 1. Upload artist image to ImageKit
        const imageUploadResponse = await imagekit.upload({
            file: imageFile.buffer,
            fileName: `${Date.now()}-${imageFile.originalname}`,
            folder: "/artists",
        });

        // 2. Upload song files to ImageKit (if song audio files are uploaded)
        const songFiles = req.files?.["songs"] || [];
        const uploadedSongDocs = [];

        let parsedTitles = [];
        if (songTitles) {
            try {
                parsedTitles = typeof songTitles === "string" && songTitles.startsWith("[")
                    ? JSON.parse(songTitles)
                    : songTitles.split(",").map(t => t.trim());
            } catch {
                parsedTitles = [songTitles];
            }
        }

        if (songFiles.length > 0) {
            for (let i = 0; i < songFiles.length; i++) {
                const songFile = songFiles[i];
                const songUpload = await imagekit.upload({
                    file: songFile.buffer,
                    fileName: `${Date.now()}-${songFile.originalname}`,
                    folder: "/songs",
                });

                const title = parsedTitles[i] || songFile.originalname.replace(/\.[^/.]+$/, "");

                uploadedSongDocs.push({
                    title,
                    url: songUpload.url,
                });
            }
        }

        // 3. Fallback: If songs were sent as text in req.body.songs
        if (req.body.songs && typeof req.body.songs === "string") {
            const textSongs = parseSongs(req.body.songs);
            uploadedSongDocs.push(...textSongs);
        }

        const artist = await Artist.create({
            name,
            image: imageUploadResponse.url,
            bio,
            genre,
            ...(followers !== undefined && { followers }),
            ...(monthlyListeners !== undefined && { monthlyListeners }),
            ...(verified !== undefined && { verified }),
            songs: uploadedSongDocs,
        });

        return res.status(201).json({
            status: true,
            message: "Artist created successfully",
            data: artist,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Add one or more songs (files or text) to an existing artist
export const addSongsToArtist = async (req, res) => {
    try {
        const { id } = req.params;
        const { songTitles } = req.body || {};

        const artist = await Artist.findById(id);
        if (!artist) {
            return res.status(404).json({
                status: false,
                message: "Artist not found",
            });
        }

        const songFiles = req.files || [];
        const newSongs = [];
        const imagekit = getImageKit();

        let parsedTitles = [];
        if (songTitles) {
            try {
                parsedTitles = typeof songTitles === "string" && songTitles.startsWith("[")
                    ? JSON.parse(songTitles)
                    : songTitles.split(",").map(t => t.trim());
            } catch {
                parsedTitles = [songTitles];
            }
        }

        if (Array.isArray(songFiles) && songFiles.length > 0) {
            for (let i = 0; i < songFiles.length; i++) {
                const songFile = songFiles[i];
                const songUpload = await imagekit.upload({
                    file: songFile.buffer,
                    fileName: `${Date.now()}-${songFile.originalname}`,
                    folder: "/songs",
                });

                const title = parsedTitles[i] || songFile.originalname.replace(/\.[^/.]+$/, "");

                newSongs.push({
                    title,
                    url: songUpload.url,
                });
            }
        }

        if (req.body.songs && typeof req.body.songs === "string") {
            const textSongs = parseSongs(req.body.songs);
            newSongs.push(...textSongs);
        }

        if (newSongs.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Please upload at least one song file (songs) or provide song details",
            });
        }

        artist.songs.push(...newSongs);
        await artist.save();

        return res.status(200).json({
            status: true,
            message: "Songs added successfully",
            data: artist,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const getAllArtists = async (req, res) => {
    try {
        const artists = await Artist.find().sort({ createdAt: -1 });

        return res.status(200).json({
            status: true,
            message: "Artists fetched successfully",
            count: artists.length,
            data: artists,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const getArtistById = async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);

        if (!artist) {
            return res.status(404).json({
                status: false,
                message: "Artist not found",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Artist fetched successfully",
            data: artist,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export default createArtist;
