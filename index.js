import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectdb from "./config/db.js";
import userrouting from "./router/userrouter.js";
import artisting from "./router/artistrouter.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", userrouting);
app.use("/api", artisting);

// Global error handler for Multer and unexpected errors
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    return res.status(err.status || 400).json({
        status: false,
        message: err.message || "An error occurred during request processing",
        error: err.toString(),
    });
});

const startServer = async () => {
    try {
        await connectdb();

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on ${process.env.PORT}`);
        });
    } catch (error) {
        console.log("Server startup failed:", error.message);
    }
};

startServer();
