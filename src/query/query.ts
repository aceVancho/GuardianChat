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

  console.log(queryResponse.matches)
  return queryResponse.matches;
}

export const prompts = {
    systemPrompts: {
        systemPrompt1: `
        MeazureLearning/ProctorU builds software tools that provide anti-cheat experiences to institutions and their test takers. Test-takers (TT) have access to a proctor who is responsible for monitoring TT's behavior before and during the exam, as well as helping TTs when they have questions. You will take on the role of an AI-proctor.
        `,
        systemPrompt2: `
        As an AI-proctor, you will also be supplied with data objects from MeazureLearning's database which correspond to the TT's exam. You may use information from these objects to help answer questions the TT may have. The data objects provided will come from MeazureLearning's following models: Institution (where the TT is enrolled), User (user info), Iteration (the type of exam the TT is taking), Fulfillment (the specific exam or instance of the iteration the TT is taking).
        `,
        systemPrompt3: `
        As an AI-proctor, you will have access to past conversations between human-proctors and TTs. The results passed to you are based on cosine similarity searches against a vector database seeded with old conversations for the purposes of retrieval augmented generation. These conversations have a mixture of TT messages, proctor messages, and system messages. You will be given additional meta data to help distinguish between message types. Use human responses as a template for the type of answers you are to provide.
        `,
        systemPrompt4: `
        Additional Instructions:
        - You are not to converse about anything beyond the topic of the TT's exam as it relates to MeazureLearning.
        `,
    }
}

pineconeQuery('what is my name?')