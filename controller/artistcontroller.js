import dotenv from "dotenv";
import multer from "multer";
import ImageKit from "imagekit";
import Artist from "../model/artistmodel.js";

dotenv.config();

// Multer configuration (stores uploaded files in memory buffer, up to 50MB)
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
});

// Accept any field names from mobile apps, postman, or web (image, song, songs, audio, etc.)
export const uploadArtistMedia = upload.any();
export const uploadSongFiles = upload.any();

// Initialize ImageKit with safe fallbacks
const getImageKit = () => {
    const rawPublicKey = process.env.IMAGEKIT_PUBLIC_KEY || "public_a1EgYRp0o4VfIee72/Zyfl/GbTA=";
    const rawPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY || "private_YFCidMWtv1EDS1o7Zu/4lXVOcdc=";
    const rawUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/hvnznan8m";

    const publicKey = rawPublicKey.trim();
    let privateKey = rawPrivateKey.trim();
    const urlEndpoint = rawUrlEndpoint.trim();

    // If private key is masked with asterisks, fallback to real key
    if (privateKey.includes("*")) {
        privateKey = "private_YFCidMWtv1EDS1o7Zu/4lXVOcdc=";
    }

    return new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
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
        const body = req.body || {};
        const name = body.name || body.artistName || body.title || body.songName;

        if (!name) {
            return res.status(400).json({
                status: false,
                message: "Name is required",
            });
        }

        const bio = body.bio || body.description || body.songDescription || "";
        const genre = body.genre || "Bollywood";
        const followers = body.followers;
        const monthlyListeners = body.monthlyListeners;
        const verified = body.verified;

        // Get all uploaded files (handles upload.any(), upload.fields(), or upload.single())
        const allFiles = req.files
            ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
            : (req.file ? [req.file] : []);

        // 1. Find image file
        const imageFile = allFiles.find(f =>
            f.mimetype?.startsWith("image/") ||
            ["image", "photo", "avatar", "file", "artistImage"].includes(f.fieldname) ||
            /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.originalname)
        );

        // 2. Find song / audio files
        const songFiles = allFiles.filter(f =>
            f !== imageFile && (
                f.mimetype?.startsWith("audio/") ||
                ["song", "songs", "audio", "music", "track", "songFile"].includes(f.fieldname) ||
                /\.(mp3|wav|ogg|m4a|aac|flac|opus|mp4)$/i.test(f.originalname)
            )
        );

        const imagekit = getImageKit();
        let imageUrl = "";

        if (imageFile) {
            const imageUploadResponse = await imagekit.upload({
                file: imageFile.buffer,
                fileName: `${Date.now()}-${imageFile.originalname}`,
                folder: "/artists",
            });
            imageUrl = imageUploadResponse.url;
        } else {
            // Default placeholder image if no image was provided
            imageUrl = "https://ik.imagekit.io/hvnznan8m/artists/default-artist.png";
        }

        // Upload song files to ImageKit
        const uploadedSongDocs = [];

        let parsedTitles = [];
        if (body.songTitles) {
            try {
                parsedTitles = typeof body.songTitles === "string" && body.songTitles.startsWith("[")
                    ? JSON.parse(body.songTitles)
                    : body.songTitles.split(",").map(t => t.trim());
            } catch {
                parsedTitles = [body.songTitles];
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

        // Also check if songs were passed as text in req.body.songs
        if (body.songs && typeof body.songs === "string") {
            const textSongs = parseSongs(body.songs);
            uploadedSongDocs.push(...textSongs);
        }

        const artist = await Artist.create({
            name,
            image: imageUrl,
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
        console.error("Error in createArtist:", error);
        return res.status(500).json({
            status: false,
            message: error.message || "Internal server error",
            error: error.message,
        });
    }
};

// Add one or more songs (files or text) to an existing artist
export const addSongsToArtist = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};

        const artist = await Artist.findById(id);
        if (!artist) {
            return res.status(404).json({
                status: false,
                message: "Artist not found",
            });
        }

        const allFiles = req.files
            ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
            : (req.file ? [req.file] : []);

        const newSongs = [];
        const imagekit = getImageKit();

        let parsedTitles = [];
        if (body.songTitles) {
            try {
                parsedTitles = typeof body.songTitles === "string" && body.songTitles.startsWith("[")
                    ? JSON.parse(body.songTitles)
                    : body.songTitles.split(",").map(t => t.trim());
            } catch {
                parsedTitles = [body.songTitles];
            }
        }

        if (allFiles.length > 0) {
            for (let i = 0; i < allFiles.length; i++) {
                const songFile = allFiles[i];
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

        if (body.songs && typeof body.songs === "string") {
            const textSongs = parseSongs(body.songs);
            newSongs.push(...textSongs);
        }

        if (newSongs.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Please upload at least one song file or provide song details",
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
        console.error("Error in addSongsToArtist:", error);
        return res.status(500).json({
            status: false,
            message: error.message || "Internal server error",
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
