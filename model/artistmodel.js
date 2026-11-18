
import mongoose from "mongoose";

const artistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        default: "",
    },
    genre: {
        type: String,
    },
    followers: {
        type: Number,
        default: 0,
    },
    monthlyListeners: {
        type: Number,
        default: 0,
    },
    verified: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

const Artist = mongoose.model("Artist", artistSchema);

export default Artist;
