import express from "express";
import { db_connect } from "../../packages/shared/db.connect.js";
import User from "./models/model.user.js";
import errorHandler from "./utils/ErrorHandler.js";
const app = express();
// importing routes
import  UserRouter from "./routes/route.user.js" 
///
app.use("/api/user", UserRouter);
app.use(errorHandler)
app.get('/test',async(req,res)=>{
    res.status(200).json({
        sucess:true,
        message:"api is runnig"
    })
})
app.listen(8000,()=>{
    console.log("server is running on port no 8000");
    db_connect();
})