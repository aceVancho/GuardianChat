import dotenv from 'dotenv';
dotenv.config();

const init = async () => {
    console.log(`GuardianChat running on port ${process.env.PORT}`);
};

init();



  
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