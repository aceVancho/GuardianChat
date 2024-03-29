import dotenv from 'dotenv';
import readline from 'readline';
dotenv.config();

import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";

import OpenAI from "openai";
import { langchainQuery, pineconeQuery } from './query/query';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

// Instantiate a new Pinecone client, which will automatically read the
// env vars: PINECONE_API_KEY and PINECONE_ENVIRONMENT which come from
// the Pinecone dashboard at https://app.pinecone.io

const pinecone = new Pinecone();
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
const vectorStore = await PineconeStore.fromExistingIndex(
  new OpenAIEmbeddings(),
  { pineconeIndex }
);

const init = async () => {
    console.log(`GuardianChat running on port ${process.env.PORT}`);

    while (true) {
      const query = await prompt('Ask an exam-related question a test-taker would ask:  ')
      pineconeQuery(query)
      langchainQuery(query)
    }
};

init();