import express from "express"
import { SighUpUser } from "../controllers/controller.user.js";

const UserRouter = express.Router();
UserRouter.post("/signup",SighUpUser)