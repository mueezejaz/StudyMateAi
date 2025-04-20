import mongoose from "mongoose"
import dotenv from "dotenv"
import env_config from "../../apps/server/config/env.config.js"
console.log("mongodb is", env_config.get("MONGODB_ATLAS_URI"))
export const db_connect = async ()=>{

    try {

      await mongoose.connect(env_config.get("MONGODB_ATLAS_URI")) 

      console.log("mongo db is connected ")
    } catch (error) {
       console.log("error connecting database", error.message) 
    }
}
