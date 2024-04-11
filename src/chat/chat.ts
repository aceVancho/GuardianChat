import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

import { SystemMessage, BaseMessageChunk } from "@langchain/core/messages";
import { Session, ZepClient } from "@getzep/zep-js";
import { ZepChatMessageHistory } from "@getzep/zep-js/langchain";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
    RunnableWithMessageHistory
} from "@langchain/core/runnables";
import { pineconeQuery, prompts } from "./query.js";
import { formatDataForSystemMessage, processFilesInDirectory } from "../utils/utils.js";
import { handleToolCalls, tools } from "../tools/tools.js";
import { mockAPICall } from "../api/api.js";


dotenv.config();
const ZEP_API_KEY = process.env.ZEP_API_KEY!
const zepClient = await ZepClient.init(ZEP_API_KEY,);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const inputPrompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

const prompt = ChatPromptTemplate.fromMessages([
    ["system", prompts.systemPrompts.systemPrompt1],
    ["system", prompts.systemPrompts.systemPrompt2],
    ["system", prompts.systemPrompts.systemPrompt3],
    ["system", prompts.systemPrompts.systemPrompt4],
    ["system", prompts.systemPrompts.systemPrompt5],
    ["system", 'Here are relevant past conversations: {additionalContext}'],
    new MessagesPlaceholder("additionalContext"),
    ["system", 'Here is the associated data for this users exam now: {dataFromDB}'],
    new MessagesPlaceholder("dataFromDB"),
    ["system", 'Current conversation history:'],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
]);

const buildChain = (sessionId: string) => {
    const llm = new ChatOpenAI({
        temperature: 0.8,
        modelName: process.env.CHAT_COMPLETION_MODEL,
    }).bind({ tools })

    const chain = prompt.pipe(llm);

    const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: async (sessionId) => {
            const messageHistory = new ZepChatMessageHistory({
                client: zepClient,
                sessionId: sessionId,
                memoryType: "perpetual",
            })
            return messageHistory
        },
        inputMessagesKey: "question",
        historyMessagesKey: "history",
    });

    return chainWithHistory;
}

const initSession = async (session_id: string, data?: any) => {
    const session: Session = new Session({
        session_id,
        metadata: data || {}
    });
    
    zepClient.memory.addSession(session)
}

export const run = async() => {
    const data = await mockAPICall();
    const session_id: string = uuidv4();
    const chain = buildChain('1059303213')
    initSession(session_id, data);

    while (true) {
        const inputText = await inputPrompt('Input: ')
        const matches = await pineconeQuery(inputText)
    
        const additionalContext = matches.map((match) => {
            return new SystemMessage({ 
                content: match?.metadata?.text as string,
                response_metadata: {}
            })
        });
    
        const options = {
            configurable: {
                sessionId: session_id,
            },
        };
        const input = { 
            question: inputText + '\n', 
            additionalContext,
            dataFromDB: new SystemMessage({ 
                content: formatDataForSystemMessage(data), 
                response_metadata: {} 
            }) 
         }
    
        const result = await chain.invoke(input, options); 
        handleToolCalls(result);

        console.log(`\nAI Proctor: ${result.content}\n`);
        // console.log(result)
        // console.log(result.lc_kwargs.additional_kwargs.tool_calls)
    
    }
}









