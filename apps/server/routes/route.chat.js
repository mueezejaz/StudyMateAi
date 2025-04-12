import express from 'express';
import { 
  createChat, 
  getChats, 
  getChatById, 
  sendMessage, 
  deleteChat, 
  updateChatTitle 
} from '../controllers/controller.chat.js';
import { authenticateUser } from "../middleware/middleware.auth.js";

const Chatrouter = express.Router();

// Apply authentication middleware to all chat routes
Chatrouter.use(authenticateUser);

// Create a new chat
Chatrouter.post('/create', createChat);

// Get all chats for the authenticated user
Chatrouter.get('/', getChats);

// Get a specific chat by ID
Chatrouter.get('/:chatId', getChatById);

// Send a message in a chat
Chatrouter.post('/:chatId/message', sendMessage);

// Delete a chat
Chatrouter.delete('/:chatId', deleteChat);

// Update chat title
Chatrouter.patch('/:chatId/title', updateChatTitle);

export default Chatrouter;