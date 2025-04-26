import env_config from "../config/env.config.js"
import {Queue} from "bullmq";
const redisUrl = env_config.get("RADIS_URI"); 
const GetQueue  = async ()=>{
    try {
        const myQueue = new Queue('fileProcessing', { connection: {
        host:env_config.get("RADIS_HOST"), 
        port: env_config.get("RADIS_PORT"),
        password:env_config.get("RADIS_PASSWORD"),
        tls: {}
    }});
    
    return myQueue;
  } catch (error) {
    console.error('Error setting up queue:', error);
    throw error;
  }
}
const _getQueue = await GetQueue()
export default _getQueue