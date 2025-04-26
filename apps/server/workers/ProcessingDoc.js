import queue from "../utils/Queue.js";
import Agent from "../models/model.agent.js";
import { Worker } from "bullmq";
import { Mistral } from '@mistralai/mistralai';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import fs from 'fs';
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "path";
import env_config from "../config/env.config.js";

// === Utility Functions ===

async function updateFileStatus(agentId, filename, status) {
  try {
    const result = await Agent.findOneAndUpdate(
      { _id: agentId, "files.filename": filename },
      { $set: { "files.$.status": status } },
      { new: true }
    );
    return !!result;
  } catch (error) {
    console.error(`Error updating file status: ${error.message}`);
    return false;
  }
}

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

// === Document Processing Functions ===

async function processPDFDocument(agentId, filePath, originalFileName) {
  const apiKey = env_config.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not defined");

  const clientMistral = new Mistral({ apiKey });
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const fileName = path.basename(filePath);
  const uploaded_pdf = await clientMistral.files.upload({
    file: { fileName, content: fs.readFileSync(filePath) },
    purpose: "ocr"
  });

  const signedUrl = await clientMistral.files.getSignedUrl({ fileId: uploaded_pdf.id });
  const ocrResponse = await clientMistral.ocr.process({
    model: "mistral-ocr-latest",
    document: { type: "document_url", documentUrl: signedUrl.url }
  });
  function cleanText(text) {
    return text
      .replace(/\s+/g, " ")       // Collapse multiple spaces
      .replace(/[^\S\r\n]+/g, " ") // Remove non-visible whitespace
      .trim();
  }
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 400,
    separators: ["\n\n", "\n", ".", "!", "?", ",", " "]
  });
  let allSplits = [];

  for (const page of ocrResponse.pages || []) {
    const pageText = cleanText(page.markdown || page.text || "")
    if (!pageText.trim()) continue;

    const metadata = { pageNumber: page.index, agentId, originalFileName, fileName };
    const splits = await splitter.splitDocuments([
      new Document({ pageContent: pageText, metadata })
    ]);
    allSplits.push(...splits);
  }

  if (allSplits.length === 0) throw new Error("No text extracted");

  const client = new MongoClient(env_config.get("MONGODB_ATLAS_URI"));
  await client.connect();

  const collection = client
    .db(env_config.get("MONGODB_ATLAS_DB_NAME"))
    .collection(env_config.get("MONGODB_ATLAS_COLLECTION_NAME"));

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: env_config.get("GOOGLE_APPLICATION_CREDENTIALS"),
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: fileName,
  });

  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: "vector_index",
    textKey: "text",
    embeddingKey: "embedding",
  });

  const batchSize = 20;
  for (let i = 0; i < allSplits.length; i += batchSize) {
    const batch = allSplits.slice(i, i + batchSize);
    await vectorStore.addDocuments(batch);
  }

  await client.close();
  return true;
}

async function processImageDocument(agentId, filePath, originalFileName) {
  const apiKey = env_config.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not defined");

  const clientMistral = new Mistral({ apiKey });
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const fileName = path.basename(filePath);
  const uploaded_image = await clientMistral.files.upload({
    file: { fileName, content: fs.readFileSync(filePath) },
    purpose: "ocr"
  });

  const signedUrl = await clientMistral.files.getSignedUrl({ fileId: uploaded_image.id });
  const ocrResponse = await clientMistral.ocr.process({
    model: "mistral-ocr-latest",
    document: { type: "document_url", documentUrl: signedUrl.url }
  });

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  let allSplits = [];

  for (const page of ocrResponse.pages || []) {
    const pageText = page.markdown || page.text || "";
    if (!pageText.trim()) continue;

    const metadata = { pageNumber: page.index, agentId, originalFileName, fileName };
    const splits = await splitter.splitDocuments([
      new Document({ pageContent: pageText, metadata })
    ]);
    allSplits.push(...splits);
  }

  if (allSplits.length === 0) throw new Error("No text extracted from image");

  const client = new MongoClient(env_config.get("MONGODB_ATLAS_URI"));
  await client.connect();

  const collection = client
    .db(env_config.get("MONGODB_ATLAS_DB_NAME"))
    .collection(env_config.get("MONGODB_ATLAS_COLLECTION_NAME"));

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    apiKey: env_config.get("GOOGLE_APPLICATION_CREDENTIALS"),
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: fileName,
  });

  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: "vector_index",
    textKey: "text",
    embeddingKey: "embedding",
  });

  await vectorStore.addDocuments(allSplits);
  await client.close();
  return true;
}

// === Worker Setup ===

const setupWorker = async () => {
  const worker = new Worker("fileProcessing", async job => {
    const { agentId, filePath, fileType, filename, orignalFileName } = job.data;
    try {
      console.log("start process", orignalFileName)
      const statusUpdated = await updateFileStatus(agentId, filename, "processing");
      if (!statusUpdated) throw new Error("Failed to update file status");

      const success = fileType === 'pdf'
        ? await processPDFDocument(agentId, filePath, orignalFileName)
        : await processImageDocument(agentId, filePath, orignalFileName);

      if (success) {
        await updateFileStatus(agentId, filename, "completed");
        deleteFile(filePath);
        return { status: 'completed', agentId };
      } else {
        throw new Error("Processing failed");
      }
    } catch (error) {
      await updateFileStatus(agentId, filename, "failed");
      deleteFile(filePath);
      throw error;
    }
  }, {
    connection: {
      host: "creative-aardvark-40124.upstash.io",
      port: 6379,
      password: "AZy8AAIjcDE0OGJkMjYxNGY5OWU0MjhiOGVjZjI0YzhjOWZkNjY1OHAxMA",
      tls: {}
    },
    concurrency:5,
  })

  worker.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed with error: ${err}`);
  });

  worker.on('completed', async (job) => {
    console.log(`Job ${job.id} completed:`);
  });
};

export { setupWorker };





