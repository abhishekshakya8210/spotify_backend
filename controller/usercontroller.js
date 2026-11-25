import jwt from "jsonwebtoken";
import User from "../model/usermodel.js";

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "spotify_secret_key_123",
        { expiresIn: "7d" }
    );
};

// Register user (If email already exists, logs in seamlessly instead of failing)
export const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: false,
                message: "Please fill all fields",
            });
        }

        let user = await User.findOne({ email });

        // If email already exists, update and log them in seamlessly
        if (user) {
            user.password = password;
            if (role) user.role = role;
            await user.save();

            const token = generateToken(user);

            return res.status(200).json({
                status: true,
                message: "User already exists, logged in successfully",
                token,
                data: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                },
            });
        }

        // If user does not exist, create new account
        const userPayload = { email, password };
        if (role) userPayload.role = role;

        const newUser = await User.create(userPayload);
        const token = generateToken(newUser);

        return res.status(201).json({
            status: true,
            message: "User registered successfully",
            token,
            data: {
                id: newUser._id,
                email: newUser.email,
                role: newUser.role,
            },
        });
    } catch (e) {
        return res.status(400).json({
            status: false,
            message: e.message || "Registration failed",
        });
    }
};

// Login user (If email does not exist, registers automatically)
export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: false,
                message: "Please fill all fields",
            });
        }

        let user = await User.findOne({ email });

        // If user doesn't exist yet, create account
        if (!user) {
            const userPayload = { email, password };
            if (role) userPayload.role = role;
            user = await User.create(userPayload);
        } else {
            // If user exists, update password & role if provided
            user.password = password;
            if (role && user.role !== role) {
                user.role = role;
            }
            await user.save();
        }

        const token = generateToken(user);

        return res.status(200).json({
            status: true,
            message: "User login successfully",
            token,
            data: {
                id: user._id,
                email: user.email,
                role: user.role,
            },
        });
    } catch (e) {
        return res.status(400).json({
            status: false,
            message: e.message || "Login failed",
        });
    }
};

// Get current logged-in user profile (protected route demo)
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Profile fetched successfully",
            data: user,
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            message: e.message || "Internal server error",
        });
    }
};

export default login;
