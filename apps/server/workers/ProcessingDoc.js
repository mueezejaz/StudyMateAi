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
    const result = await Agent.findOneAndUpdate(
      { 
        _id: agentId, 
        "files._id": fileId 
      },
      { 
        $set: { "files.$.status": status } 
      },
      { new: true }
    );
    
    if (!result) {
      console.error(`Could not update status for file ${fileId} in agent ${agentId}`);
      return false;
    }
    
    console.log(`File ${fileId} status updated to ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating file status: ${error.message}`);
    return false;
  }
}

// Delete file from server
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted file: ${filePath}`);
      return true;
    } else {
      console.log(`File not found for deletion: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

// Find file by path in an agent
async function findFileByPath(agentId, filePath) {
  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    const file = agent.files.find(f => f.path === filePath);
    if (!file) {
      throw new Error(`File not found in agent with path: ${filePath}`);
    }
    
    return file;
  } catch (error) {
    console.error(`Error finding file: ${error.message}`);
    return null;
  }
}

async function processPDFDocument(agentId, filePath, originalFileName) {
  try {
    // Load environment variables
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY is not defined in environment variables");
    }
    
    // Initialize Mistral client
    const clientMistral = new Mistral({ apiKey });
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist at path: ${filePath}`);
    }
    
    // Read the file
    const uploaded_file = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    console.log(`Uploading file ${fileName} to Mistral for OCR processing...`);
    
    // Upload to Mistral for OCR processing
    const uploaded_pdf = await clientMistral.files.upload({
      file: {
        fileName: fileName,
        content: uploaded_file,
      },
      purpose: "ocr"
    }).catch(err => {
      throw new Error(`Mistral file upload failed: ${err.message}`);
    });
    
    console.log(`File uploaded to Mistral with ID: ${uploaded_pdf.id}`);
    
    // Get signed URL for processing
    const signedUrl = await clientMistral.files.getSignedUrl({
      fileId: uploaded_pdf.id,
    }).catch(err => {
      throw new Error(`Failed to get signed URL: ${err.message}`);
    });
    
    console.log(`Processing file with OCR...`);
    
    // Process with OCR
    const ocrResponse = await clientMistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      }
    }).catch(err => {
      throw new Error(`OCR processing failed: ${err.message}`);
    });
    
    console.log(`OCR processing complete. Found ${ocrResponse.pages.length} pages.`);
    
    if (!ocrResponse.pages || ocrResponse.pages.length === 0) {
      throw new Error("OCR processing returned no pages");
    }
    
    // Text splitting for better embedding
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // Process each page
    let allSplits = [];
    for (const page of ocrResponse.pages) {
      let pageText = page.markdown || page.text || "";
      if (!pageText.trim()) {
        console.warn(`Empty text content for page ${page.index}`);
        continue;
      }
      
      let metadata = {
        pageNumber: page.index,
        agentId,
        originalFileName,
        fileName 
      };
      
      const splits = await splitter.splitDocuments([
        new Document({ pageContent: pageText, metadata })
      ]);
      
      allSplits.push(...splits);
    }
    
    if (allSplits.length === 0) {
      throw new Error("No valid text content extracted from document");
    }
    
    console.log(`Document split into ${allSplits.length} chunks. Connecting to MongoDB...`);
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_ATLAS_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_ATLAS_URI is not defined in environment variables");
    }
    
    const client = new MongoClient(mongoUri);
    await client.connect().catch(err => {
      throw new Error(`Failed to connect to MongoDB: ${err.message}`);
    });
    
    const dbName = process.env.MONGODB_ATLAS_DB_NAME;
    const collectionName = process.env.MONGODB_ATLAS_COLLECTION_NAME;
    
    if (!dbName || !collectionName) {
      await client.close();
      throw new Error("MongoDB database or collection name not defined in environment variables");
    }
    
    const collection = client.db(dbName).collection(collectionName);
    
    console.log(`Generating embeddings using Google Generative AI...`);
    
    // Initialize embeddings model
    const googleApiKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!googleApiKey) {
      await client.close();
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not defined in environment variables");
    }
    
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: googleApiKey,
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
    
    console.log(`Storing document chunks in vector database...`);
    
    // Add documents to vector store in batches to avoid timeouts
    const batchSize = 20;
    for (let i = 0; i < allSplits.length; i += batchSize) {
      const batch = allSplits.slice(i, i + batchSize);
      await vectorStore.addDocuments(batch).catch(err => {
        throw new Error(`Failed to add documents to vector store: ${err.message}`);
      });
      console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allSplits.length/batchSize)}`);
    }
    
    // Close MongoDB connection
    await client.close();
    
    console.log(`Document processing complete for ${fileName}`);
    return true;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
}

// Process image files (PNG, JPG)
async function processImageDocument(agentId, filePath, originalFileName) {
  try {
    // For now, let's implement basic OCR for images similar to PDF processing
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY is not defined in environment variables");
    }
    
    const clientMistral = new Mistral({ apiKey });
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist at path: ${filePath}`);
    }
    
    const uploaded_file = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    console.log(`Uploading image ${fileName} to Mistral for OCR processing...`);
    
    // Upload to Mistral for OCR processing
    const uploaded_image = await clientMistral.files.upload({
      file: {
        fileName: fileName,
        content: uploaded_file,
      },
      purpose: "ocr"
    }).catch(err => {
      throw new Error(`Mistral file upload failed: ${err.message}`);
    });
    
    // Get signed URL for processing
    const signedUrl = await clientMistral.files.getSignedUrl({
      fileId: uploaded_image.id,
    }).catch(err => {
      throw new Error(`Failed to get signed URL: ${err.message}`);
    });
    
    // Process with OCR
    const ocrResponse = await clientMistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      }
    }).catch(err => {
      throw new Error(`OCR processing failed: ${err.message}`);
    });
    
    // Similar processing as PDF from here...
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    let allSplits = [];
    for (const page of ocrResponse.pages) {
      let pageText = page.markdown || page.text || "";
      if (!pageText.trim()) continue;
      
      let metadata = {
        pageNumber: page.index,
        agentId,
        originalFileName,
        fileName 
      };
      
      const splits = await splitter.splitDocuments([
        new Document({ pageContent: pageText, metadata })
      ]);
      
      allSplits.push(...splits);
    }
    
    if (allSplits.length === 0) {
      throw new Error("No valid text content extracted from image");
    }
    
    // MongoDB processing same as PDF...
    const client = new MongoClient(process.env.MONGODB_ATLAS_URI);
    await client.connect();
    
    const collection = client
      .db(process.env.MONGODB_ATLAS_DB_NAME)
      .collection(process.env.MONGODB_ATLAS_COLLECTION_NAME);
    
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      title: fileName,
    });
    
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
    
    console.log(`Image processing complete for ${fileName}`);
    return true;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}

// Setup the worker
const setupWorker = async () => {
  if (!queue) {
    console.error("Queue is not available. Worker setup failed.");
    return false;
  }

  // Clean up any existing process handlers
  queue.removeAllListeners('failed');
  queue.removeAllListeners('succeeded');
  
  // Set up global event handlers
  queue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
  });
  
  queue.on('succeeded', (job, result) => {
    console.log(`Job ${job.id} completed successfully with result:`, result);
  });

  queue.process(2,async (job) => {
    const { agentId, filePath, fileType, orignalFileName } = job.data;
    console.log(`Starting job ${job.id}: Processing file ${filePath} (${fileType}) for agent ${agentId}`);
    
    try {
      // Find the file in the database
      const file = await findFileByPath(agentId, filePath);
      
      if (!file) {
        throw new Error(`File not found in agent ${agentId} with path ${filePath}`);
      }
      
      const fileId = file._id;
      
      // Update status to processing
      const statusUpdated = await updateFileStatus(agentId, fileId, "processing");
      
      if (!statusUpdated) {
        throw new Error(`Failed to update file status to 'processing'`);
      }
      
      // Process based on file type
      let success = false;
      
      // Fix the typo in originalFileName and use the corrected version
      const originalFileName = orignalFileName || path.basename(filePath);
      
      if (fileType === 'pdf') {
        success = await processPDFDocument(agentId, filePath, originalFileName);
      } else if (['png', 'jpg', 'jpeg'].includes(fileType)) {
        success = await processImageDocument(agentId, filePath, originalFileName);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      
      // Update status based on processing result
      if (success) {
        await updateFileStatus(agentId, fileId, "completed");
        console.log(`Job ${job.id} processing completed successfully`);
        
        // Delete the file from server after successful processing
        deleteFile(filePath);
        return { status: 'completed', fileId, agentId };
      } else {
        throw new Error("Processing completed but with errors");
      }
    } catch (error) {
      console.error(`Job ${job.id} error:`, error);
      
      // Try to find the file and update status to failed
      try {
        const file = await findFileByPath(agentId, filePath);
        if (file) {
          await updateFileStatus(agentId, file._id, "failed");
        }
      } catch (statusError) {
        console.error(`Failed to update status: ${statusError.message}`);
      }
      
      // Still try to delete the file from server even if processing failed
      deleteFile(filePath);
      
      // Rethrow the error to mark the job as failed
      throw error;
    }
  });
  
  console.log("File processing worker setup complete");
  return true;
};

export { setupWorker };

