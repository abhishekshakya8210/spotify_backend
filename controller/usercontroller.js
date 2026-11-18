import jwt from "jsonwebtoken";
import User from "../model/usermodel.js";


const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "spotify_secret_key_123",
        { expiresIn: "7d" }
    );
};


export const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: false,
                message: "Please fill all fields",
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: false,
                message: "User with this email already exists",
            });
        }

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

// Login user
export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: false,
                message: "Please fill all fields",
            });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        // If user doesn't exist yet, create account (or signup)
        if (!user) {
            const userPayload = { email, password };
            if (role) userPayload.role = role;
            user = await User.create(userPayload);
        } else {
            // Check password
            if (user.password !== password) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid email or password",
                });
            }

         
            if (role && user.role !== role) {
                user.role = role;
                await user.save();
            }
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
