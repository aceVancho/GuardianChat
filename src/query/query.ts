import dotenv from 'dotenv';
import readline from 'readline';
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

import { PineconeStore } from "@langchain/pinecone";
import { OpenAI as langchainOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { VectorStoreRetrieverMemory } from "langchain/memory";
import { LLMChain } from "langchain/chains";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PromptTemplate } from "@langchain/core/prompts";

dotenv.config();
const openai = new OpenAI();
const model = "gpt-4-0125-preview"

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt1 = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

const memoryTest = async () => {
    const vectorStore = new MemoryVectorStore(new OpenAIEmbeddings());
    const memory = new VectorStoreRetrieverMemory({
      // 1 is how many documents to return, you might want to return more, eg. 4
      vectorStoreRetriever: vectorStore.asRetriever(1),
      memoryKey: "history",
    });

    await memory.saveContext(
        { input: "My name is Adam. I am a human." },
        { output: "Good to meet you, Adam. I'm Sequoia the dog. Woof!" }
    );
    await memory.saveContext(
        { input: "I like the color green." },
        { output: "I like peanuts." }
    );
    await memory.saveContext(
        { input: "Would you like to snuggle?" },
        { output: "Yes I love to snuggle." }
    );

    // Prints relevant history given the prompt.
    // console.log(await memory.loadMemoryVariables({ prompt: "What is the human's name?" }));
    // console.log(await memory.loadMemoryVariables({ prompt: "What is the name of the dog?" }));
    // console.log(await memory.loadMemoryVariables({ prompt: "What is everyone's favorite food?" }));

    
    // // Now let's use it in a chain.
    const model = new langchainOpenAI({ temperature: 0.9 });
    const prompt = PromptTemplate.fromTemplate(`
        The following is a friendly conversation between a human (me) and (you). If you do not know the answer to a question, truthfully respond that you do not know.
        
        Relevant pieces of previous conversation:
        {history}
        
        (You do not need to use these pieces of information if not relevant)
        
        Current conversation:
        Human: {input}
        AI:
    `);
    
    const chain = new LLMChain({ llm: model, prompt, memory });

    while (true) {
        const query = await prompt1('Input:  ')
        const response = await chain.call({ input: query })
        console.log(response);

        await memory.saveContext(
            { input: query },
            { output: response }
        )
    }



    // const res1 = await chain.call({ input: "Hi, my name is Perry, what's up?" });
    // console.log({ res1 });
    // /*
    // {
    //     res1: {
    //     text: " Hi Perry, I'm doing great! I'm currently exploring different topics related to artificial intelligence like natural language processing and machine learning. What about you? What have you been up to lately?"
    //     }
    // }
    // */
    
    // const res2 = await chain.call({ input: "what's my favorite sport?" });
    // console.log({ res2 });
    // /*
    // { res2: { text: ' You said your favorite sport is soccer.' } }
    // */
    
    // const res3 = await chain.call({ input: "what's my name?" });
    // console.log({ res3 });
    // /*
    // { res3: { text: ' Your name is Perry.' } }
    // */
}

memoryTest()


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

  queryResponse.matches.forEach((match) => console.log(match))
}

// PROMPTS
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