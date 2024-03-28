import dotenv from 'dotenv';
import readline from 'readline';
dotenv.config();

import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";

import OpenAI from "openai";

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

const openai = new OpenAI();
const model = "gpt-4-0125-preview"


export async function askChatGPT(word: string) {
    const prompt = 'hi'
    const completion = await openai.chat.completions.create({
    
      messages: [
          {"role": "system", "content": prompt},
          {"role": "user", "content": `Define: ${word}`},
        ],
      model,
    });
  
    const response = completion?.choices[0]?.message?.content;
    return response;
  };

const init = async () => {
    console.log(`GuardianChat running on port ${process.env.PORT}`);

    const query = await prompt('Ask an exam-related question a test-taker would ask:  ')
    console.log(`You asked: "${query}"`)
    /* Search the vector DB independently with metadata filters */
    const vectorStoreResults = await vectorStore.similaritySearch(query, 1, {
    //   foo: "bar",
    });
    console.log('vectorStoreResults:', vectorStoreResults);
};

init();

const systemPrompt1 = `
MeazureLearning/ProctorU builds software tools that provide anti-cheat experiences to institutions and their test takers. Test-takers (TT) have access to a proctor who is responsible for monitoring TT's behavior before and during the exam, as well as helping TTs when they have questions. You will take on the role of an AI-proctor.
`

const systemPrompt2 = `
As an AI-proctor, you will also be supplied with data objects from MeazureLearning's database which correspond to the TT's exam. You may use information from these objects to help answer questions the TT may have. The data objects provided will come from MeazureLearning's following models: Institution (where the TT is enrolled), User (user info), Iteration (the type of exam the TT is taking), Fulfillment (the specific exam or instance of the iteration the TT is taking).
`

const systemPrompt3 = `
As an AI-proctor, you will have access to past conversations between human-proctors and TTs. The results passed to you are based on cosine similarity searches against a vector database seeded with old conversations for the purposes of retrieval augmented generation. These conversations have a mixture of TT messages, proctor messages, and system messages. You will be given additional meta data to help distinguish between message types. Use human responses as a template for the type of answers you are to provide.`

const systemPrompt4 = `
Additional Instructions:
- You are not to converse about anything beyond the topic of the TT's exam as it relates to MeazureLearning.
`

  
// OLD INIT
// const init = async () => {
//     console.log(`GuardianChat running on port ${process.env.PORT}`)
//     const pinecone = new Pinecone();
//     const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)

//     const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
//     await pc.describeIndex('serverless-index');

//     const docs = await loadDocsFromCsv('src/data/raw/chatlogSample.csv');
//     const chunks = await createChunks(docs);

//     const openAiEmbeddingsOptions = {
//         apiKey: process.env.OPENAI_API_KEY,
//         engine: 'text-embedding-ada-002',
//         /** 
//          * `true` causes embeddings.js:172 to trip up on undefined text entries
//          * even though they ought not exist. Replace with below code to get working.
//          * Modified code:
//          *  
//          * const batches = chunkArray(this.stripNewLines
//               ? texts.map((t) => (t ? t.replace(/\n/g, " ") : ""))
//               : texts,
//             this.batchSize
//           );
//          *
//          * Original code:
//          * const batches = chunkArray(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
//         */
//         stripNewLines: true,
//         batchSize: 10
//     }

//     const dbConfig = { pineconeIndex, maxConcurrency: 5 }

//     await PineconeStore.fromDocuments(
//         chunks, new OpenAIEmbeddings(openAiEmbeddingsOptions), dbConfig);
// }

// init();

// const deleteIndex = async () => {
//     const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
//     const index = pc.index("guardian-chat")
    
//     // await index.deleteAll();
//     await pc.deleteIndex('guardian-chat')
// }

// // deleteIndex()