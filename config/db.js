import mongoose from "mongoose";

const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connect DB successfully");
    } catch (e) {
        console.log("Connect DB failed:", e.message);
    }
};

export default connectdb;