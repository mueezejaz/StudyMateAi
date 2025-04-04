import Agent from "../models/mode.agent.js";
import User from "../models/model.user.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";

// Create a new agent
export const createAgent = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !description) {
      throw new ApiError(400, "Name and description are required");
    }
    
    const agent = await Agent.create({
      name,
      description,
      admin: req.user._id,
      sharedWith: []
    });
    
    return res.status(201).json(
      new ApiResponse(201, agent, "Agent created successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Get all agents accessible by the user (created by user or shared with user)
export const getAgents = async (req, res, next) => {
  try {
    // Find agents where user is admin or in sharedWith array
    const agents = await Agent.find({
      $or: [
        { admin: req.user._id },
        { sharedWith: req.user._id }
      ]
    }).populate('admin', 'username');
    
    return res.status(200).json(
      new ApiResponse(200, { agents }, "Agents retrieved successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Share agent with another user
export const shareAgent = async (req, res, next) => {
  try {
    const { agentId, email } = req.body;
    
    if (!agentId || !email) {
      throw new ApiError(400, "Agent ID and user email are required");
    }
    
    // Find the agent
    const agent = await Agent.findById(agentId);
    
    if (!agent) {
      throw new ApiError(404, "Agent not found");
    }
    
    // Verify the current user is the admin
    if (agent.admin.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to share this agent");
    }
    
    // Find the user to share with
    const userToShare = await User.findOne({ email });
    
    if (!userToShare) {
      throw new ApiError(404, "User not found");
    }
    
    // Check if already shared
    if (agent.sharedWith.includes(userToShare._id)) {
      throw new ApiError(400, "Agent already shared with this user");
    }
    
    // Add user to sharedWith array
    agent.sharedWith.push(userToShare._id);
    await agent.save();
    
    return res.status(200).json(
      new ApiResponse(200, agent, "Agent shared successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Unshare agent with a user
export const unshareAgent = async (req, res, next) => {
  try {
    const { agentId, userId } = req.body;
    
    if (!agentId || !userId) {
      throw new ApiError(400, "Agent ID and user ID are required");
    }
    
    // Find the agent
    const agent = await Agent.findById(agentId);
    
    if (!agent) {
      throw new ApiError(404, "Agent not found");
    }
    
    // Verify the current user is the admin
    if (agent.admin.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to modify this agent");
    }
    
    // Remove user from sharedWith array
    agent.sharedWith = agent.sharedWith.filter(
      id => id.toString() !== userId
    );
    
    await agent.save();
    
    return res.status(200).json(
      new ApiResponse(200, agent, "User removed from shared access")
    );
  } catch (error) {
    next(error);
  }
};

// Delete an agent
export const deleteAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    
    // Find the agent
    const agent = await Agent.findById(agentId);
    
    if (!agent) {
      throw new ApiError(404, "Agent not found");
    }
    
    // Verify the current user is the admin
    if (agent.admin.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to delete this agent");
    }
    
    await Agent.findByIdAndDelete(agentId);
    
    return res.status(200).json(
      new ApiResponse(200, {}, "Agent deleted successfully")
    );
  } catch (error) {
    next(error);
  }
};
