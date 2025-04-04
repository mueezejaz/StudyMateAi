
import express from "express";
import { 
  createAgent, 
  getAgents, 
  shareAgent, 
  unshareAgent, 
  deleteAgent, 
  getAgentById
} from "../controllers/controller.agent.js";
import { 
  uploadFiles, 
  getFiles, 
  updateFileStatus,
  deleteFile 
} from "../controllers/controller.file.js";
import { authenticateUser } from "../middleware/middleware.auth.js";
import upload from "../middleware/middleware.upload.js";

const AgentRouter = express.Router();

AgentRouter.use(authenticateUser);

// Agent routes
AgentRouter.post("/create", createAgent);
AgentRouter.get("/", getAgents);
AgentRouter.post("/share", shareAgent);
AgentRouter.post("/unshare", unshareAgent);
AgentRouter.get("/:agentId", getAgentById);
AgentRouter.delete("/:agentId", deleteAgent);

// File routes
AgentRouter.post("/:agentId/files", upload.array("files", 5), uploadFiles);
AgentRouter.get("/:agentId/files", getFiles);
AgentRouter.put("/files/status", updateFileStatus);
AgentRouter.delete("/:agentId/files/:fileId", deleteFile);

export default AgentRouter;

