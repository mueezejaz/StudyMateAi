import Bee from 'bee-queue';
import Redis from "ioredis"

const redisUrl = process.env.RADIS_URI; // Get this from Upstash console
console.log(redisUrl)
console.log(redisUrl)
const GetQueue  = async ()=>{
    try {
        const connection = new Redis(redisUrl);
        await connection.set('foo', 'bar');
        const queue = new Bee('file-processing', {
        redis: redisUrl,
        isWorker: true,
        removeOnSuccess: true
    });
    
    // Set up event listeners for the queue
    queue.on('ready', () => {
      console.log('Queue is ready to process jobs');
    });
    
    queue.on('error', (err) => {
      console.error('Queue error:', err);
    });
    
    return queue;
  } catch (error) {
    console.error('Error setting up queue:', error);
    throw error;
  }
}
const _getQueue = await GetQueue()
export default _getQueue