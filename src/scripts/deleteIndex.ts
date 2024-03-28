import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const deleteIndex = async () => {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    await pc.deleteIndex(process.env.PINECONE_INDEX!);
}

deleteIndex();