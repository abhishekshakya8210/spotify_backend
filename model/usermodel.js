import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    role: {
        type: String,
        enum: {
            values: ["user", "artist", "admin"],
            message: "{VALUE} is not a valid role. Allowed roles are: user, artist, admin",
        },
        default: "user",
        trim: true,
        lowercase: true,
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
