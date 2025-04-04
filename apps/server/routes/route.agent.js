import express from "express";
import { createAgent, getAgents, shareAgent, unshareAgent, deleteAgent } from "../controllers/controller.agent.js";
import { authenticateUser } from "../middleware/middleware.auth.js";

const AgentRouter = express.Router();

AgentRouter.use(authenticateUser);

AgentRouter.post("/create", createAgent);
AgentRouter.get("/", getAgents);
AgentRouter.post("/share", shareAgent);
AgentRouter.post("/unshare", unshareAgent);
AgentRouter.delete("/:agentId", deleteAgent);

export default AgentRouter;
