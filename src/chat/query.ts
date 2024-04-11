import dotenv from 'dotenv';
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAI as langchainOpenAI, OpenAIEmbeddings } from "@langchain/openai";

dotenv.config();
const openai = new OpenAI();

export const langchainQuery = async (query: string) => {
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );
  const vectorStoreResults = await vectorStore.similaritySearch(query, 1, { });
  console.log('vectorStoreResults:', vectorStoreResults);
}

export const pineconeQuery = async (query: string) => {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
  const index = pc.index(process.env.PINECONE_INDEX!)

  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    encoding_format: "float",
    input: query,
  });

  const queryResponse = await index.query({
      vector: response.data[0].embedding,
      topK: 3,
      includeMetadata: true
  });

  // queryResponse.matches.forEach((match, index) => {
  //     console.log(`Match ${index + 1}:`, match);
  // });
  return queryResponse.matches;
}