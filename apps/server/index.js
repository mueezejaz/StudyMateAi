import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { db_connect } from "../../packages/shared/db.connect.js";
import dotenv from 'dotenv'
import errorHandler from "./utils/ErrorHandler.js";
dotenv.config({
    path:'./.env'
})
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173", // React dev server
  credentials: true
}));

// Import routes
import UserRouter from "./routes/route.user.js";
import AgentRouter from "./routes/route.agent.js";
import { setupWorker } from "./workers/ProcessingDoc.js";

// Routes
app.use("/api/user", UserRouter);
app.use("/api/agent", AgentRouter);
app.use(errorHandler);

app.get('/test', async(req, res) => {
    res.status(200).json({
        success: true,
        message: "API is running"
    });
});

app.listen(8000, () => {
    console.log("Server is running on port 8000");
    db_connect();
    setupWorker();
});