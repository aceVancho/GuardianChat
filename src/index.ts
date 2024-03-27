import fs from 'fs';
import csv from 'csv-parser';

import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { Tiktoken } from 'tiktoken/lite';
import p50k_base from 'tiktoken/encoders/p50k_base.json' assert { type: 'json'};


dotenv.config();

const loadDocsFromCsv = (csvFilePath: string) => {
    return new Promise<Document[]>((resolve, reject) => {
      const docs: Document[] = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          const formattedRow = Object.fromEntries(
            Object.entries(row).map(([key, value]) => {
                return [key.trim(), value || '']
            })
          );
          const doc = new Document({
            metadata: {
              startTime: formattedRow['Start Time'] || '',
              endTime: formattedRow['End Time'] || '',
              totalTime: formattedRow['Total Time'] || '',
              sessionId: formattedRow['Session ID'] || '',
              ttName: formattedRow['Name'] || '',
              technicianName: formattedRow['Technician Name'] || '',
              technicianId: formattedRow['Technician ID'] || '',
              technicianEmail: formattedRow['Technician Email'] || '',
              notes: formattedRow['Notes'] || '',
              technicianGroup: formattedRow['Technician Group'] || '',
            },
            pageContent: formattedRow['Chatlog'] ? String(formattedRow['Chatlog']) : ''

          });
          docs.push(doc);
        })
        .on('end', () => resolve(docs))
        .on('error', (error) => reject(error));
    });
  };

  const TIKTOKEN_ENCODING = 'p50k_base';
  const MAX_CONTENT_LENGTH = 8192;

  function splitChatlog(text: string, maxTokens=MAX_CONTENT_LENGTH): string[] {
      if (tiktokenLen(text) <= maxTokens) {
          return [text];
      } else {
          const middle = Math.floor(text.length / 2);
          const left = text.substring(0, middle);
          const right = text.substring(middle);
          return splitChatlog(left, maxTokens).concat(splitChatlog(right, maxTokens));
      }
  }
  
  function tiktokenLen(text: string): number {
      const encoding = new Tiktoken(
          p50k_base.bpe_ranks,
          p50k_base.special_tokens,
          p50k_base.pat_str
      );
      const tokens = encoding.encode(text);
      if (tokens.length === 11889) console.log(text)
      encoding.free(); 
      return tokens.length;
  }

  import { v4 as uuidv4 } from 'uuid'; // Import the UUID library



  class ChunkDocument extends Document {
      parentId: string;
      chunkNumber: number;
  
      constructor({ parentId, chunkNumber, metadata, content }: {
          parentId: string,
          chunkNumber: number,
          metadata: Record<string, any>,
          content: string
      }) {
          super({ metadata, pageContent: content });
          this.parentId = parentId;
          this.chunkNumber = chunkNumber;
      }
  }


  const createChunks = async (docs: Document<Record<string, any>>[]): Promise<ChunkDocument[]> => {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 20,
    });

    const chunkDocuments: ChunkDocument[] = [];

    for (const doc of docs) {
        const parentId = uuidv4(); // Generate a unique ID for the parent document
        const pageContent = new Document({ pageContent: doc['pageContent'] });
        const docOutput = await textSplitter.splitDocuments([pageContent]);

        docOutput.forEach((rec, index) => {
            const chunkDoc = new ChunkDocument({
                parentId: parentId,
                chunkNumber: index + 1,
                metadata: { ...doc.metadata },
                content: rec['pageContent'],
            });

            chunkDocuments.push(chunkDoc);
        });
    }

    return chunkDocuments;
};



  

const init = async () => {
    console.log(`GuardianChat running on port ${process.env.PORT}`)
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
    const docs = await loadDocsFromCsv('src/data/raw/chatlogSample.csv');
    const chunks = await createChunks(docs);

    const openAiEmbeddingsOptions = {
        apiKey: process.env.OPENAI_API_KEY,
        engine: 'text-embedding-ada-002',
        /** 
         * `true` causes embeddings.js:172 to trip up on undefined text entries
         * even though they ought not exist. Replace with below code to get working.
         * Modified code:
         *  
         * const batches = chunkArray(this.stripNewLines
              ? texts.map((t) => (t ? t.replace(/\n/g, " ") : ""))
              : texts,
            this.batchSize
          );
         *
         * Original code:
         * const batches = chunkArray(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
        */
        stripNewLines: true,
        batchSize: 10
    }

    const dbConfig = { pineconeIndex, maxConcurrency: 5 }

    await PineconeStore.fromDocuments(
        chunks, new OpenAIEmbeddings(openAiEmbeddingsOptions), dbConfig);
}

init();

const deleteIndex = async () => {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
    const index = pc.index("guardian-chat")
    
    // await index.deleteAll();
    await pc.deleteIndex('guardian-chat')
}

// deleteIndex()