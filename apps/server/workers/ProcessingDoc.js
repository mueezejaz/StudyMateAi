import queue from "../utils/Queue.js";
import Agent from "../models/model.agent.js";
import { Mistral } from '@mistralai/mistralai';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import fs from 'fs';
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "path";

// Update file status in database
async function updateFileStatus(agentId, fileId, status) {
  try {
    await Agent.findOneAndUpdate(
      { 
        _id: agentId, 
        "files._id": fileId 
      },
      { 
        $set: { "files.$.status": status } 
      }
    );
    console.log(`File ${fileId} status updated to ${status}`);
  } catch (error) {
    console.error(`Error updating file status: ${error.message}`);
  }
}

// Delete file from server
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted file: ${filePath}`);
    } else {
      console.log(`File not found for deletion: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
}

// Find file by Id in an agent
async function findFileById(agentId, fileId) {
  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    const file = agent.files.id(fileId);
    if (!file) {
      throw new Error(`File not found in agent: ${fileId}`);
    }
    
    return file;
  } catch (error) {
    console.error(`Error finding file: ${error.message}`);
    return null;
  }
}

async function processPDFDocument(agentId,filePath,orignalFileName) {
  try {
    // Load environment variables
    
    // Initialize Mistral client
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY is not defined in environment variables");
    }
    const clientMistral = new Mistral({ apiKey });
    
    // Read the file
    const uploaded_file = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Upload to Mistral for OCR processing
    const uploaded_pdf = await clientMistral.files.upload({
      file: {
        fileName: fileName,
        content: uploaded_file,
      },
      purpose: "ocr"
    });
    
    // Get signed URL for processing
    const signedUrl = await clientMistral.files.getSignedUrl({
      fileId: uploaded_pdf.id,
    });
    
    // Process with OCR
    const ocrResponse = await clientMistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      }
    });
    
    // Text splitting for better embedding
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // Process each page
    let allSplits = [];
    for (const page of ocrResponse.pages) {
      let pageText = page.markdown;
      let metadata = {
        pageNumber: page.index,
        agentId,
        orignalFileName,
        fileName 
      };
      const splits = await splitter.splitDocuments([new Document({ pageContent: pageText, metadata })]);
      allSplits.push(...splits);
    }
    
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_ATLAS_URI);
    await client.connect();
    
    const collection = client
      .db(process.env.MONGODB_ATLAS_DB_NAME)
      .collection(process.env.MONGODB_ATLAS_COLLECTION_NAME);
    
    // Initialize embeddings model
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      title: fileName,
    });
    
    // Initialize vector store
    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: collection,
      indexName: "vector_index",
      textKey: "text",
      embeddingKey: "embedding",
    });
    
    // Add documents to vector store
    await vectorStore.addDocuments(allSplits);
    
    // Close MongoDB connection
    await client.close();
    
    return true;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
}

// Process image files (PNG, JPG)
async function processImageDocument(agentId,filePath) {
  try {
    // Similar implementation to processPDFDocument but for images
    // You could use Mistral's OCR for images as well
    
    // For now, we'll return true to indicate success
    // Implement actual image processing logic here
    return true;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}

const setupWorker = async () => {
  if (!queue) {
    console.error("Queue is not available. Worker setup failed.");
    return;
  }

  queue.process(2,async (job) => {
    const { agentId, filePath, fileType,orignalFileName } = job.data;
    console.log(`Processing file: ${filePath} (${fileType}) for agent: ${agentId}`);
    
    try {
      // Find the file in the database to get the correct fileId
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Find the file by matching the path
      const file = agent.files.find(f => f.path === filePath);
      if (!file) {
        throw new Error(`File not found in agent with path: ${filePath}`);
      }
      
      const fileId = file._id;
      
      // Update status to processing
      await updateFileStatus(agentId, fileId, "processing");
      
      // Process based on file type
      let success = false;
      if (fileType === 'pdf') {
        success = await processPDFDocument(agentId,filePath,orignalFileName);
      } else if (['png', 'jpg', 'jpeg'].includes(fileType)) {
        success = await processImageDocument(filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      
      // Update status based on processing result
      if (success) {
        await updateFileStatus(agentId, fileId, "completed");
        // Delete the file from server after successful processing
        deleteFile(filePath);
        return { status: 'completed' };
      } else {
        throw new Error("Processing completed but with errors");
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      
      // Try to update status to failed
      try {
        const agent = await Agent.findById(agentId);
        if (agent) {
          const file = agent.files.find(f => f.path === filePath);
          if (file) {
            await updateFileStatus(agentId, file._id, "failed");
          }
        }
      } catch (statusError) {
        console.error("Failed to update file status:", statusError);
      }
      
      // Delete the file from server even if processing failed
      deleteFile(filePath);
      
      throw error; // Re-throw to let queue know job failed
    }
  });
  
  console.log("File processing worker setup complete");
};

export { setupWorker };

