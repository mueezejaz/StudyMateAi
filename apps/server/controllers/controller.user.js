import User from "../models/model.user.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";

export const SignUpUser = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new ApiError(400, "Username, email, and password are required");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError(409, "Email already exists. Please use a different email.");
        }

        const newUser = await User.create({ username, email, password });
        
        newUser.password = undefined;

        return res.status(201).json(new ApiResponse(201, newUser, "User registered successfully"));

    } catch (error) {
        next(error);
    }
};
export const getCurrentUser = async (req, res, next) => {
  try {
    return res.status(200).json(
      new ApiResponse(200, { user: req.user }, "User retrieved successfully")
    );
  } catch (error) {
    next(error);
  }
};
export const LoginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            throw new ApiError(401, "Invalid email or password");
        }

        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid email or password");
        }

        const token = user.generateAuthToken();
        
        const userResponse = user.toObject();
        delete userResponse.password;

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"||false,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: "strict"
        });

        return res.status(200).json(
            new ApiResponse(200, { user: userResponse, token }, "Login successful")
        );
    } catch (error) {
        next(error);
    }
};

export const LogoutUser = async (req, res, next) => {
    try {
        res.clearCookie("token");
        return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully"));
    } catch (error) {
        next(error);
    }
};

