import queue from "../utils/Queue.js"
const setupWorker = async () => {
  queue.process(async (job) => {
    const { agentId, filePath, fileType } = job.data;
    console.log(`Processing file: ${filePath} (${fileType}) for agent: ${agentId}`);
    
    // Your file processing logic here
    // ...
    
    return { status: 'completed' };
  });
};

export { setupWorker };

