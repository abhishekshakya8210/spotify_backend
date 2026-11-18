
import express from "express";
import dotenv from "dotenv";
import connectdb from "./config/db.js";
import userrouting from "./router/userrouter.js";
import artisting from "./router/artistrouter.js";

dotenv.config();

const app = express();

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
