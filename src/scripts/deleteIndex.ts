import { Pinecone } from '@pinecone-database/pinecone';

const deleteIndex = async () => {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    await pc.deleteIndex(process.env.PINECONE_INDEX!);
}

deleteIndex();