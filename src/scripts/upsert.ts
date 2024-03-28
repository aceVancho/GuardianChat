import fs from 'fs';
import csv from 'csv-parser';

import { v4 as uuidv4 } from 'uuid';

import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { Tiktoken } from 'tiktoken/lite';
import p50k_base from 'tiktoken/encoders/p50k_base.json' assert { type: 'json'};

const SAMPLE_CHAT_LOGS_PATH = 'src/data/raw/chatlogSample.csv'
const CHAT_LOGS_PATH = 'src/data/raw/chatlog.csv'

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
        const parentId = uuidv4();
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

const upsert = async () => {
    const docs = await loadDocsFromCsv(CHAT_LOGS_PATH);
    const chunks = await createChunks(docs);

    const openAiEmbeddingsOptions = {
        apiKey: process.env.OPENAI_API_KEY!,
        engine: 'text-embedding-ada-002',
        stripNewLines: true,
        batchSize: 10
    };

    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
    const dbConfig = { pineconeIndex, maxConcurrency: 5 };

    await PineconeStore.fromDocuments(
        chunks, new OpenAIEmbeddings(openAiEmbeddingsOptions), dbConfig);
    console.log('Data upserted.');
};

upsert();

