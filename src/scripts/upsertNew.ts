import fs from 'fs';
import csv from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import { Pinecone, PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import OpenAI from "openai";

// TODO: FIX
// import { CreateEmbeddingResponse } from 'openai/lib/openai';


const CHAT_LOGS_PATH = 'src/data/clean/chatlog_clean.csv';

interface Session {
    metadata: Record<string, any>;
    chatLog: string;
}

interface ChunkedChatLog {
    id: string;
    sessionId: string;
    chunkNumber: number;
    metadata: Record<string, any>;
    chatLog: string
    embedding?: Number[]
}

const loadChatLogsFromCsv = (csvFilePath: string): Promise<Session[]> => {
    return new Promise<Session[]>((resolve, reject) => {
        const chatLogs: Session[] = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                const formattedRow = Object.fromEntries(
                    Object.entries(row).map(([key, value]) => {
                        return [key.trim(), value || ''];
                    })
                );
                const chatLog: Session = {
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
                    chatLog: formattedRow['Chatlog'] ? String(formattedRow['Chatlog']) : ''
                };
                chatLogs.push(chatLog);
            })
            .on('end', () => resolve(chatLogs))
            .on('error', (error) => reject(error));
    });
};

const createChunks = async (sessions: Session[]): Promise<ChunkedChatLog[]> => {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 20,
    });

    const chunkedChatLogs: ChunkedChatLog[] = [];

    for (const session of sessions) {
        const chatLogContent = session.chatLog;
        const splitTextLogsArray = await textSplitter.splitText(chatLogContent);

        splitTextLogsArray.forEach((text, index) => {
            const chunkedChatLog: ChunkedChatLog = {
                sessionId: session.metadata.sessionId,
                chunkNumber: index + 1,
                metadata: { ...session.metadata },
                chatLog: text,
                id: uuidv4()
            };
            chunkedChatLogs.push(chunkedChatLog);
        });
    }

    return chunkedChatLogs;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createEmbeddings = async (chatLogObjects: ChunkedChatLog[]) => {
    const openai = new OpenAI();
    const pineconeRecords: PineconeRecord<RecordMetadata>[] = [];
    
    for (const chatObject of chatLogObjects) {
        let embeddingObj: CreateEmbeddingResponse | null = null;
        let finished = false;

        while (!finished) {
            try {
                embeddingObj = await openai.embeddings.create({
                    model: "text-embedding-ada-002",
                    encoding_format: "float",
                    input: chatObject.chatLog,
                });
                finished = true;
            } catch (error) {
                console.error('Rate limit hit, retrying in 2 seconds...');
                await sleep(2000);
            }
        }

        if (embeddingObj) {
            const record = {
                id: chatObject.id,
                values: embeddingObj.data[0].embedding,
                metadata: chatObject.metadata,
            };
    
            pineconeRecords.push(record);
        }
    }

    return pineconeRecords;
};

const upsert = async () => {
    const chatLogs = await loadChatLogsFromCsv(CHAT_LOGS_PATH);
    const chatLogObjects = await createChunks(chatLogs);
    const pineconeRecords = await createEmbeddings(chatLogObjects)

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
    const index = pc.index(process.env.PINECONE_INDEX!)
    await index.upsert(pineconeRecords);
};

upsert();
