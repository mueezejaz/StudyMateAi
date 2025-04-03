import express from "express";
import { SignUpUser, LoginUser, LogoutUser, getCurrentUser } from "../controllers/controller.user.js";
import { authenticateUser } from "../middleware/middleware.auth.js";

const UserRouter = express.Router();
UserRouter.get("/me", authenticateUser, getCurrentUser);
UserRouter.post("/signup", SignUpUser);
UserRouter.post("/login", LoginUser);
UserRouter.get("/logout", authenticateUser, LogoutUser);

export default UserRouter;