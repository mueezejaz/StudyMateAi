import User from "../models/model.user.js";
import ApiError from "../utils/ApiError.js";
import ApiResponce from "../utils/ApiResponce.js";

export const SighUpUser = async (req, res, next) => {
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

        return res.status(201).json(new ApiResponse(201, newUser, "User registered successfully"));

    } catch (error) {
        next(error);
    }
};;

