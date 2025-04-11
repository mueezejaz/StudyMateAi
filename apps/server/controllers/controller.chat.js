import Chat from "../models/model.chat.js";
import Agent from "../models/model.agent.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { 
  START, 
  END, 
  MessagesAnnotation, 
  StateGraph, 
  MemorySaver 
} from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { 
  HumanMessage, 
  AIMessage, 
  SystemMessage 
} from "@langchain/core/messages";

dotenv.config();

// Initialize LLM (Google Gemini)
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  temperature: 0.2,
});

// Initialize memory store for LangGraph
const memoryStore = new InMemoryStore();

// Create a new chat
export const createChat = async (req, res, next) => {
  try {
    const { agentId, title } = req.body;
    
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
      throw new ApiError(403, "You don't have permission to chat with this agent");
    }
    
    // Create a default title if not provided
    const chatTitle = title || `Chat ${new Date().toLocaleString()}`;
    
    // Generate a unique thread ID for this chat
    const threadId = uuidv4();
    
    // Create the chat
    const chat = await Chat.create({
      title: chatTitle,
      user: req.user._id,
      agentId: agentId,
      messages: [],
      threadId: threadId // Store the thread ID for LangGraph
    });
    
    return res.status(201).json(
      new ApiResponse(201, { chat }, "Chat created successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Helper function to get chat history from MongoDB
const getChatHistory = (messages) => {
  return messages.map(msg => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.content);
    } else if (msg.role === 'assistant') {
      return new AIMessage(msg.content);
    } else if (msg.role === 'system') {
      return new SystemMessage(msg.content);
    }
    return null;
  }).filter(msg => msg !== null);
};

// Helper function to get embeddings
async function getEmbedding(text) {
  try {
    // This is a simplified approach - in production you should use a proper embedding model
    const response = await fetch(`${process.env.EMBEDDING_API_URL}/embeddings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EMBEDDING_API_KEY}`
      },
      body: JSON.stringify({ input: text })
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error getting embedding:", error);
    throw error;
  }
}

// Function to retrieve context from vector DB
async function getRelevantContext(message, agentId) {
  try {
    // Connect to MongoDB Atlas Vector Database
    const client = new MongoClient(process.env.MONGODB_ATLAS_URI);
    await client.connect();
    
    const collection = client
      .db(process.env.MONGODB_ATLAS_DB_NAME)
      .collection(process.env.MONGODB_ATLAS_COLLECTION_NAME);
    
    // Get embedding for the message
    const embedding = await getEmbedding(message);
    
    // Perform vector search
    const searchResults = await collection.aggregate([
      {
        $search: {
          index: "default",
          knnBeta: {
            vector: embedding,
            path: "embedding",
            k: 5,
            filter: {
              agentId: agentId.toString()
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          text: 1,
          score: { $meta: "searchScore" }
        }
      }
    ]).toArray();
    
    await client.close();
    
    // Combine the results into a single context string
    return searchResults
      .map(result => result.text)
      .join("\n\n");
  } catch (error) {
    console.error("Error retrieving context:", error);
    return ""; // Return empty context on error
  }
}

// Get all chats for a user
export const getChats = async (req, res, next) => {
  try {
    // Find all chats for the user
    const chats = await Chat.find({ user: req.user._id })
      .populate('agentId', 'name description')
      .sort({ updatedAt: -1 });
    
    return res.status(200).json(
      new ApiResponse(200, { chats }, "Chats retrieved successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Get a specific chat by ID
export const getChatById = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      throw new ApiError(400, "Chat ID is required");
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId)
      .populate('agentId', 'name description');
    
    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }
    
    // Verify the current user owns this chat
    if (chat.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to view this chat");
    }
    
    return res.status(200).json(
      new ApiResponse(200, { chat }, "Chat retrieved successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Send a message and get a response using LangGraph
export const sendMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    
    if (!chatId || !message) {
      throw new ApiError(400, "Chat ID and message are required");
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }
    
    // Verify the current user owns this chat
    if (chat.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to send messages in this chat");
    }
    
    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    chat.messages.push(userMessage);
    
    // Get the associated agent
    const agent = await Agent.findById(chat.agentId);
    
    if (!agent) {
      throw new ApiError(404, "Agent not found");
    }
    
    // Initialize or retrieve thread ID for LangGraph
    const threadId = chat.threadId || uuidv4();
    if (!chat.threadId) {
      chat.threadId = threadId;
    }
    
    // Get relevant context from documents
    const context = await getRelevantContext(message, chat.agentId);
    
    // Create LangGraph workflow
    const checkpointer = new MemorySaver();
    
    // Define the node function that will process messages
    const processMessage = async (state) => {
      // Convert existing chat history to LangChain message format
      const history = getChatHistory(chat.messages.slice(0, -1)); // Exclude the newest message
      
      // Create system message with context
      const systemMessage = new SystemMessage(
        `You are a helpful AI assistant. Answer questions based on the following context:\n\n${context}\n\n` +
        `If you cannot find the answer in the context, say so politely. Be concise but thorough.`
      );
      
      // Prepare messages for the LLM
      const newUserMessage = new HumanMessage(message);
      const messages = [systemMessage, ...history, newUserMessage];
      
      // Call the LLM
      const response = await llm.invoke(messages);
      
      return { messages: [response] };
    };
    
    // Build the graph
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("process", processMessage)
      .addEdge(START, "process")
      .addEdge("process", END);
    
    const app = workflow.compile({ checkpointer });
    
    // Set up config with thread ID
    const config = { configurable: { thread_id: threadId } };
    
    // Invoke the workflow
    const input = [{ role: "user", content: message }];
    const output = await app.invoke({ messages: input }, config);
    
    // Extract the response
    const aiResponse = output.messages[output.messages.length - 1].content;
    
    // Add assistant message to chat
    const assistantMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };
    
    chat.messages.push(assistantMessage);
    await chat.save();
    
    return res.status(200).json(
      new ApiResponse(200, { 
        message: assistantMessage,
        chatId: chat._id 
      }, "Message sent successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Delete a chat
export const deleteChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      throw new ApiError(400, "Chat ID is required");
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }
    
    // Verify the current user owns this chat
    if (chat.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to delete this chat");
    }
    
    // Delete the chat
    await Chat.findByIdAndDelete(chatId);
    
    return res.status(200).json(
      new ApiResponse(200, {}, "Chat deleted successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Update chat title
export const updateChatTitle = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;
    
    if (!chatId || !title) {
      throw new ApiError(400, "Chat ID and title are required");
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      throw new ApiError(404, "Chat not found");
    }
    
    // Verify the current user owns this chat
    if (chat.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You don't have permission to update this chat");
    }
    
    // Update the chat title
    chat.title = title;
    await chat.save();
    
    return res.status(200).json(
      new ApiResponse(200, { chat }, "Chat title updated successfully")
    );
  } catch (error) {
    next(error);
  }
};