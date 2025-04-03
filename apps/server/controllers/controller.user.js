import User from "../models/model.user.js";
import ApiError from "../utils/ApiError.js";
import ApiResponce from "../utils/ApiResponce.js";

export const SighUpUser = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new ApiError(400, "Username, email, and password are required");
        }
        let user = new User({name:username,email,password})
        await user.save()
        delete user.password
        return res.status(201).json(new ApiResponce(201,{user},"Id is created successfully"))
    } catch (error) {
        next(error); 
    }
};

