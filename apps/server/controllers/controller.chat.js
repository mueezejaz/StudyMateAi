import Chat from "../models/model.chat.js";
import Agent from "../models/model.agent.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponce.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { v4 as uuidv4 } from "uuid";
import env_config from "../config/env.config.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import {
  MessagesAnnotation,
  StateGraph,
  Annotation,
  MemorySaver,
} from "@langchain/langgraph";
import {
  ToolNode
} from "@langchain/langgraph/prebuilt";
import { toolsCondition } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
// Initialize LLM (Google Gemini)
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: env_config.get("GOOGLE_APPLICATION_CREDENTIALS"),
  temperature: 0.2,
});

// Initialize memory store for LangGraph
const checkpointer = new MemorySaver();

// Define the retrieve tool
const retrieveSchema = z.object({ query: z.string() });
const retrieve = async (state) => {
  console.log(state)
  const client = new MongoClient(env_config.get("MONGODB_ATLAS_URI"));
  await client.connect();

  const collection = client
    .db(env_config.get("MONGODB_ATLAS_DB_NAME"))
    .collection(env_config.get("MONGODB_ATLAS_COLLECTION_NAME"));

  // Initialize embedding model
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: env_config.get("GOOGLE_APPLICATION_CREDENTIALS"),
  });

  // Initialize Vector Store
  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection: collection,
    indexName: "vector_index",
    textKey: "text",
    embeddingKey: "embedding",
  });
  const queryString = state.messages.map(m => m.content).join(" ");
  const retrievedDocs = await vectorStore.similaritySearch(queryString, 3);

  state.context = retrievedDocs
  return { context: retrievedDocs };
};
const buildRetrieveTool = tool(
  async ({ query }) => {
    try {
      // Connect to MongoDB Atlas Vector Database
      console.log(query)
      const client = new MongoClient(env_config.get("MONGODB_ATLAS_URI"));
      await client.connect();

      const collection = client
        .db(env_config.get("MONGODB_ATLAS_DB_NAME"))
        .collection(env_config.get("MONGODB_ATLAS_COLLECTION_NAME"));

      // Initialize embedding model
      const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "text-embedding-004",
        apiKey: env_config.get("GOOGLE_APPLICATION_CREDENTIALS"),
      });

      // Initialize Vector Store
      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: collection,
        indexName: "vector_index",
        textKey: "text",
        embeddingKey: "embedding",
      });

      // Perform similarity search with filter for this agent
      const retrievedDocs = await vectorStore.similaritySearch(query, 3, {
        // agentId: agentId.toString()
      });
      console.log(retrievedDocs)
      await client.close();

      // Format the results
      const serialized = retrievedDocs
        .map(doc => `Source: ${doc.metadata.source || 'Unknown'}\nContent: ${doc.pageContent}`)
        .join("\n\n");

      return serialized;
    } catch (error) {
      console.error("Error retrieving context:", error);
      return "Error retrieving documents. No context available.";
    }
  },
  {
    name: "retrieve",
    description: "Retrieve information related to the user's query.",
    schema: retrieveSchema,
  }
);


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

// Helper function to convert MongoDB messages to LangChain message format
const convertToLangChainMessages = (messages) => {
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

// Send a message and get a response using LangGraph conversational RAG pattern
// Send a message and get a response using LangGraph conversational RAG pattern
// Send a message and get a response using LangGraph conversational RAG pattern
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

    // Define the retrieve function
    const retrieve = async (state) => {
      try {
        const client = new MongoClient(env_config.get("MONGODB_ATLAS_URI"));
        await client.connect();

        const collection = client
          .db(env_config.get("MONGODB_ATLAS_DB_NAME"))
          .collection(env_config.get("MONGODB_ATLAS_COLLECTION_NAME"));

        // Initialize embedding model
        const embeddings = new GoogleGenerativeAIEmbeddings({
          model: "text-embedding-004",
          apiKey: env_config.get("GOOGLE_APPLICATION_CREDENTIALS"),
        });

        // Initialize Vector Store
        const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
          collection: collection,
          indexName: "vector_index",
          textKey: "text",
          embeddingKey: "embedding",
        });

        // Use all messages to generate a better query
        const queryString = state.messages.map(m => m.content).join(" ");
        const retrievedDocs = await vectorStore.similaritySearch(queryString, 3);

        await client.close();

        return { context: retrievedDocs };
      } catch (error) {
        console.error("Error retrieving context:", error);
        return { context: [] };
      }
    };

    // Generate the final response with retrieved context
    const generateResponse = async (state) => {
      // Format retrieved context
      const docsContent = state.context.map(doc => doc.pageContent).join("\n\n");

      // Convert existing chat messages to LangChain format
      const chatHistory = chat.messages.map(msg => {
        if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else if (msg.role === 'assistant') {
          return new AIMessage(msg.content);
        } else if (msg.role === 'system') {
          return new SystemMessage(msg.content);
        }
        return null;
      }).filter(msg => msg !== null);
     console.log(docsContent) 
      // Create system message with context and tone guidance
      const systemMessageContent =
        `You are a helpful AI assistant named ${agent.name}. ${agent.description || ''}\n\n` +
        `Use the following retrieved information to answer the user's question:\n\n` +
        `${docsContent}\n\n` +
        `Important tone instructions:\n` +
        `- Respond in a friendly, conversational manner\n` +
        `When responding with math or logic expressions, format them using LaTeX syntax:\n` +
        `- Use $$...$$ for block math (displayed on its own line)\n` +
        `- Use \\overline{...} to represent NOT or negation with a bar over the entire expression\n` +
        `- Use \\cdot for AND, and + for OR\n` +
        `- Example:\n` +
        `  \\overline{A + B} = \\overline{A} \\cdot \\overline{B} should be written as:\n` +
        `  $$\\overline{A + B} = \\overline{A} \\cdot \\overline{B}$$\n\n` +
        `- Use markdown formatting for better readability\n` +
        `- Use proper heading hierarchy (# for main titles, ## for subtitles)\n` +
        `- Format code blocks with the appropriate language for syntax highlighting\n` +
        `- If showing math equations, use LaTeX formatting with $$ for block equations or $ for inline\n` +
        `- Use bullet points and numbered lists when appropriate\n` +
        `- Bold or italicize key points to improve readability\n` +
        `- Keep your tone warm and helpful\n` +
        `- Start with a greeting or acknowledgment of the user's question\n\n` +
        `If you cannot find the answer in the retrieved information, say so politely.`;

      // Prepare messages for final response
      const promptMessages = [
        new SystemMessage(systemMessageContent),
        ...chatHistory
      ];

      // Generate the final response including the previous messages
      const response = await llm.invoke(promptMessages);

      return { messages: [response] };
    };

    // Set up LangGraph workflow
    const annotation = Annotation.Root({
      messages: Annotation,
      context: Annotation
    });

    // Build a simpler graph with just retrieve and generate
    const graphBuilder = new StateGraph(annotation)
      .addNode("retrieve", retrieve)
      .addNode("generateResponse", generateResponse)
      .addEdge("__start__", "retrieve")
      .addEdge("retrieve", "generateResponse")
      .addEdge("generateResponse", "__end__");

    // Compile the graph
    const workflow = graphBuilder.compile();

    // Convert user message to LangChain format
    const input = {
      messages: [new HumanMessage(message)]
    };

    // Execute the workflow
    const result = await workflow.invoke(input);

    // Extract the final AI response
    const lastMessage = result.messages[result.messages.length - 1];
    const aiResponseContent = lastMessage.content;

    // Add assistant message to chat
    const assistantMessage = {
      role: 'assistant',
      content: aiResponseContent,
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