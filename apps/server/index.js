import express from "express";
import { db_connect } from "../../packages/shared/db.connect.js";
import User from "./models/model.user.js";
import errorHandler from "./utils/ErrorHandler.js";
const app = express();
app.use("/api/users", userRoutes);
app.use(errorHandler)
app.get('/test',async(req,res)=>{
    await user.save()
    res.status(200).json({
        sucess:true,
        message:"api is runnig"
    })
})
app.listen(8000,()=>{
    console.log("serer is running on port no 8000");
    db_connect();
})