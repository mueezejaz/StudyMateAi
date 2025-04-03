import express from "express";
import { db_connect } from "../../packages/shared/db.connect.js";
const app = express();
app.get('/test',(req,res)=>{
    res.status(200).json({
        sucess:true,
        message:"api is runnig"
    })
})
app.listen(8000,()=>{
    console.log("serer is running on port no 8000");
    db_connect();
})