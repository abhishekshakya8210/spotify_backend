import dotenv from "dotenv";
import multer from "multer";
import ImageKit from "imagekit";
import Artist from "../model/artistmodel.js";

dotenv.config();

// Multer configuration (stores uploaded file in memory buffer)
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"), false);
        }
    },
});

// Initialize ImageKit using credentials from .env
const getImageKit = () => {
    return new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY?.trim(),
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY?.trim(),
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT?.trim(),
    });
};

export const createArtist = async (req, res) => {
    try {
        const { name, bio, genre, followers, monthlyListeners, verified } = req.body || {};

        if (!name) {
            return res.status(400).json({
                status: false,
                message: "Name is required",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                status: false,
                message: "Artist image file is required",
            });
        }

        // Upload image buffer to ImageKit
        const imagekit = getImageKit();
        const uploadResponse = await imagekit.upload({
            file: req.file.buffer,
            fileName: `${Date.now()}-${req.file.originalname}`,
            folder: "/artists",
        });

        const artist = await Artist.create({
            name,
            image: uploadResponse.url,
            bio,
            genre,
            ...(followers !== undefined && { followers }),
            ...(monthlyListeners !== undefined && { monthlyListeners }),
            ...(verified !== undefined && { verified }),
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
