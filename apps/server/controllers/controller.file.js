import { MongoClient } from "mongodb";
import Agent from "../models/model.agent.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";
import path from "path";
import fs from "fs";
import Queue from "../utils/Queue.js";
// Initialize queue

// Upload files to an agent
export const uploadFiles = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      throw new ApiError(400, "Agent ID is required");
    }
    
    // Find the agent
    const agent = await Agent.findById(agentId);
    
    if (!agent) {
      throw new ApiError(404, "Agent not found");
    }
    
    // Verify the current user is the admin or has share access
    const isAdmin = agent.admin.toString() === req.user._id.toString();
    const isShared = agent.sharedWith.some(id => id.toString() === req.user._id.toString());
    
    if (!isAdmin && !isShared) {
      throw new ApiError(403, "You don't have permission to add files to this agent");
    }
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, "No files uploaded");
    }
    
    // Process each uploaded file
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const fileType = path.extname(file.originalname).substring(1).toLowerCase();
      
      // Validate file type
      if (!['pdf', 'png', 'jpg', 'jpeg'].includes(fileType)) {
        fs.unlinkSync(file.path); // Delete invalid file
        continue; // Skip this file
      }
      
      // Create file record
      const fileRecord = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        fileType: fileType === 'jpg' || fileType === 'jpeg' ? 'jpg' : fileType,
        status: 'processing'
      };
      
      // Add file to agent
      agent.files.push(fileRecord);
      uploadedFiles.push(fileRecord);
      
    }
    
    // Save the updated agent
    await agent.save();
    // adding file to the queue 
        for (const file of req.files) {
        if (Queue) {
          await Queue.add("file",{
          agentId: agent._id.toString(),
          filePath: file.path,
          fileType: "pdf",
          filename: file.filename,
          orignalFileName:file.originalname
        },{removeOnComplete:true, removeOnFail:true});
        
      } else {
        console.warn("Queue not available, file will not be processed automatically");
      }
        }
    return res.status(200).json(
      new ApiResponse(200, { files: uploadedFiles }, "Files uploaded successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Rest of your controller code remains the same

// Get all files for an agent
export const getFiles = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      throw new ApiError(400, "Agent ID is required");
    }
    
    // Find the agent
    const agent = await Agent.findById(agentId);
    
    if (!agent) {
      throw new ApiError(404, "Agent not found");
    }
    
    // Verify the current user is the admin or has share access
    const isAdmin = agent.admin.toString() === req.user._id.toString();
    const isShared = agent.sharedWith.some(id => id.toString() === req.user._id.toString());
    
    if (!isAdmin && !isShared) {
      throw new ApiError(403, "You don't have permission to view files for this agent");
    }
    
    return res.status(200).json(
      new ApiResponse(200, { files: agent.files }, "Files retrieved successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Update file status (this could be called by your worker process)
export const updateFileStatus = async (req, res, next) => {
  try {
    const { agentId, fileId, status } = req.body;
    
    if (!agentId || !fileId || !status) {
      throw new ApiError(400, "Agent ID, file ID, and status are required");
    }
    
    if (!['uploaded', 'processing', 'completed', 'failed'].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }
    
    // Find the agent and update the file status
    const agent = await Agent.findOneAndUpdate(
      { 
        _id: agentId, 
        "files._id": fileId 
      },
      { 
        $set: { "files.$.status": status } 
      },
      { new: true }
    );
    
    if (!agent) {
      throw new ApiError(404, "Agent or file not found");
    }
    
    return res.status(200).json(
      new ApiResponse(200, { status }, "File status updated successfully")
    );
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const { agentId, fileId } = req.params;
    
    if (!agentId || !fileId) {
      throw new ApiError(400, "Agent ID and file ID are required");
    }
    
    // Find the agent
    const agent = await Agent.findById(agentId);
    
    if (!agent) {
      throw new ApiError(404, "Agent not found");
    }
    
    // Verify the current user is the admin
    if (agent.admin.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to delete files from this agent");
    }
    
    // Find the file
    const fileIndex = agent.files.findIndex(file => file._id.toString() === fileId);
    
    if (fileIndex === -1) {
      throw new ApiError(404, "File not found");
    }
    
    const file = agent.files[fileIndex];
    
    // Check if the file is still processing
    if (file.status === 'processing') {
      throw new ApiError(409, "Cannot delete file while it's being processed");
    }
    
    // Remove file from agent
    agent.files.splice(fileIndex, 1);
    await agent.save();
    
    // If file is completed, clean up vectors from the database
    if (file.status === 'completed') {
      try {
        // Connect to MongoDB
        const client = new MongoClient(process.env.MONGODB_ATLAS_URI);
        await client.connect();
        
        const collection = client
          .db(process.env.MONGODB_ATLAS_DB_NAME)
          .collection(process.env.MONGODB_ATLAS_COLLECTION_NAME);
        
        // Delete vectors for this file
        // We're using the metadata.fileName and metadata.agentId fields that were added during processing
        await collection.deleteMany({
          "agentId": agentId,
          "fileName": file.filename
        });
        
        await client.close();
        console.log(`Vectors for file ${file.filename} deleted successfully`);
      } catch (dbError) {
        console.error("Error deleting vectors:", dbError);
        // Continue even if vector deletion fails
        // This is a soft error that shouldn't prevent the file from being deleted
      }
    }
    
    // Note: We don't need to delete the physical file anymore as it's already deleted by the worker after processing
    
    return res.status(200).json(
      new ApiResponse(200, {}, "File deleted successfully")
    );
  } catch (error) {
    next(error);
  }
};
