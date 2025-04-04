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
      
      // Add file to processing queue if queue is available
      if (Queue) {
        const job = Queue.createJob({
          agentId: agent._id.toString(),
          filePath: file.path,
          fileType: fileRecord.fileType
        });
        
        await job.save();
        console.log(`Job ${job.id} created for file ${file.filename}`);
      } else {
        console.warn("Queue not available, file will not be processed automatically");
      }
    }
    
    // Save the updated agent
    await agent.save();
    
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

// Delete a file
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
    
    const filePath = agent.files[fileIndex].path;
    
    // Remove file from agent
    agent.files.splice(fileIndex, 1);
    await agent.save();
    
    // Delete file from disk
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Error deleting file:", err);
      // Continue even if file deletion fails
    }
    
    return res.status(200).json(
      new ApiResponse(200, {}, "File deleted successfully")
    );
  } catch (error) {
    next(error);
  }
};
