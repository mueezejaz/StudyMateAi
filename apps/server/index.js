import express from "express";

const app = express();
app.get('/test',(req,res)=>{
    res.status(200).json({
        sucess:true,
        message:"api is runnig"
    })
})
app.listen(8000,()=>{
    console.log("serer is running on port no 8000");
})