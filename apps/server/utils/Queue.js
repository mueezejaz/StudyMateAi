import {Queue} from 'bullmq';
import Redis from "ioredis"

const redisUrl = process.env.RADIS_URI; // Get this from Upstash console
console.log(redisUrl)
console.log(redisUrl)
const GetQueue  = async ()=>{
    try {
        const connection = new Redis(redisUrl);
        await connection.set('foo', 'bar');
        const myQueue = new Queue("file-processing",{
           connection 
        });
        return myQueue
    } catch (error) {
       console.log('error in getting queue',error) 
    }
}

export default GetQueue