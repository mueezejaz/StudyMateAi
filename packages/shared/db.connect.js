import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config({path:"../../.env"})
export const db_connect = async ()=>{
    try {

        console.log(process.env.MONGODB_CONNECTION_STRING)
      await mongoose.connect(process.env.MONGODB_CONNECTION_STRING) 

      console.log("mongo db is connected ")
    } catch (error) {
       console.log("error connecting database", error.message) 
    }
}
