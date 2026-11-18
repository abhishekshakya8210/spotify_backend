
import express from "express";
import dotenv from "dotenv";
import connectdb from "./config/db.js";
import userrouting from "./router/userrouter.js";
import artisting from "./router/artistrouter.js";

dotenv.config();

const app = express();

// Enable CORS for web/browser apps (Flutter Web, React, etc.)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());

app.use("/api", userrouting);
app.use("/api", artisting);

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
