import Queue from "bull";
import axios from "axios";
import dotenv from 'dotenv'
dotenv.config({
    path:'../.env'
})
const redisUrl = process.env.RADIS_URI; 
console.log(redisUrl)
const GetQueue  = async ()=>{
    try {
        const myQueue = new Queue("file-processing",{
            redis:{
                host:redisUrl,
                port:6379
            }
        });
        return myQueue
    } catch (error) {
       console.log('error in getting queue',error) 
    }
}
// Create a Bull queue for file processing
const fileProcessingQueue = GetQueue()
fileProcessingQueue.process(async (job) => {
  const { agentId, fileId, filePath, fileType } = job.data;
  
  console.log(`Processing file: ${filePath} (${fileType}) for agent: ${agentId}`);
  
});

console.log('File processing worker started');