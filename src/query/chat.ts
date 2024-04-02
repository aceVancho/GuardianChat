import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { Session, ZepClient } from "@getzep/zep-js";
import { ZepChatMessageHistory } from "@getzep/zep-js/langchain";
import {
    BasePromptTemplate,
    ChatPromptTemplate,
    PromptTemplate,
    MessagesPlaceholder
} from "@langchain/core/prompts";
import { ZepVectorStore } from "@getzep/zep-js/langchain";
import { formatDocument } from "langchain/schema/prompt_template";
import { Document } from "@langchain/core/documents";
import {
    RunnableMap,
    RunnableLambda,
    RunnablePassthrough,
    RunnableWithMessageHistoryInputs,
    RunnableWithMessageHistory
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";
import { pineconeQuery, prompts } from "./query.js";
import { processFilesInDirectory } from "../utils/utils.js";


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

const chain = prompt.pipe(
    new ChatOpenAI({
        temperature: 0.8,
        modelName: process.env.CHAT_COMPLETION_MODEL,
    }),
);

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

const getDataFromDB = async () => {
    const directoryPath = 'src/data/db/sessions/1059303213';
    let data;
    try {
        data = await processFilesInDirectory(directoryPath);
    } catch (error) {
        console.error('Error processing files:', error);
    }
    return data;
};

const dataFromDB = await getDataFromDB();
const session_id: string = uuidv4();
const session: Session = new Session({
    session_id,
    metadata: dataFromDB || {}
});
zepClient.memory.addSession(session)

const formatDataForSystemMessage = (data: any): string => {
    let content = '';

    if (data.enrollments && data.enrollments.length > 0) {
        content += 'Enrollments:\n';
        data.enrollments.forEach((enrollment: any) => {
            Object.entries(enrollment).forEach(([key, value]) => {
                content += `  ${key}: ${value}\n`;
            });
            content += '\n';
        });
    }

    if (data.fulfillments && data.fulfillments.length > 0) {
        content += 'Fulfillments:\n';
        data.fulfillments.forEach((fulfillment: any) => {
            Object.entries(fulfillment).forEach(([key, value]) => {
                content += `  ${key}: ${value}\n`;
            });
            content += '\n';
        });
    }

    return content.trim();
};

while (true) {
    
    const inputText = await inputPrompt('Input: ')
    const matches = await pineconeQuery(inputText)

    const additionalContext = matches.map((match) => {
        return new SystemMessage({ 
            content: match?.metadata?.text as string,
            response_metadata: {}
        })
    });

    const dataFromDBContent = formatDataForSystemMessage(dataFromDB);

    const options = {
        configurable: {
            sessionId: session_id,
        },
    };
    const input = { 
        question: inputText + '\n', 
        additionalContext,
        dataFromDB: new SystemMessage({ content: dataFromDBContent, response_metadata: {} }) 
     }


    const result = await chainWithHistory.invoke(input, options); 
    console.log(`\nAI Proctor: ${result.content}\n`);
    // console.log(result.response_metadata);
}








