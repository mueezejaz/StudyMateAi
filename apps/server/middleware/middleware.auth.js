
import jwt from "jsonwebtoken";
import User from "../models/model.user.js";
import ApiError from "../utils/ApiError.js";

export const authenticateUser = async (req, res, next) => {
    try {
        // Get token from cookies
        const token = req.cookies.token;
        
        if (!token) {
            throw new ApiError(401, "Authentication required. Please login.");
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        
        // Find user by id
        const user = await User.findById(decoded.id).select("-password");
        
        if (!user) {
            throw new ApiError(401, "Invalid authentication token");
        }
        
        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            next(new ApiError(401, "Invalid token"));
        } else if (error.name === "TokenExpiredError") {
            next(new ApiError(401, "Token expired"));
        } else {
            next(error);
        }
    }
};