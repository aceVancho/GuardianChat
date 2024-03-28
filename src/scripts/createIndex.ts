import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const createIndex = async () => {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    
    await pc.createIndex({
        name: process.env.PINECONE_INDEX!,
        dimension: 1536, // Adjust the dimension as needed
        metric: 'cosine',
        spec: { pod: { environment: 'gcp-starter', podType: 'gcp-starter' } }
    });
}

await createIndex();
