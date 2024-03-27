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
              chatLog: formattedRow['Chatlog'] || '',
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

  function splitEntryRecursively(entry: string, maxTokens: number): string[] {
      if (tiktokenLen(entry) <= maxTokens) {
          return [entry];
      } else {
          const middle = Math.floor(entry.length / 2);
          const left = entry.substring(0, middle);
          const right = entry.substring(middle);
          return splitEntryRecursively(left, maxTokens).concat(splitEntryRecursively(right, maxTokens));
      }
  }
  
  function tiktokenLen(text: string): number {
      const encoding = new Tiktoken(
          p50k_base.bpe_ranks,
          p50k_base.special_tokens,
          p50k_base.pat_str
      );
      const tokens = encoding.encode(text);
      encoding.free(); 
      console.log(text, tokens.length)
      return tokens.length;
  }


  const createChunks = async (docs: Document<Record<string, any>>[]) => {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 10,
        separators: ["\n\n", "\n"],
        lengthFunction: tiktokenLen
    });

    let docPromises = [];
    for (const doc of docs) {
        const docOutput = await textSplitter.splitDocuments([
            new Document({ pageContent: doc['pageContent'] }),
        ]);
        docPromises.push(docOutput);
    }

    return Promise.all(docPromises);
};


  

const init = async () => {
    console.log(`GuardianChat running on port ${process.env.PORT}`)
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)
    const docs = await loadDocsFromCsv('src/data/raw/chatlogSample.csv');
    const chunks = await createChunks(docs);
    const flattenedChunks = chunks.flat();

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
        flattenedChunks, new OpenAIEmbeddings(openAiEmbeddingsOptions), dbConfig);
}

init();