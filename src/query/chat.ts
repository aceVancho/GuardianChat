import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';
import readline from 'readline';
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ZepClient } from "@getzep/zep-js";
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
    ["system", 'Here are relevant past conversations: {additionalContext}'],
    new MessagesPlaceholder("additionalContext"),
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

while (true) {
    const inputText = await inputPrompt('Input:  ')
    const matches = await pineconeQuery(inputText)
    const additionalContext = matches.map((match) => {
        return new SystemMessage({ 
            content: match?.metadata?.text as string,
            response_metadata: {}
        })
    });

    const input = { question: inputText, additionalContext }

    const options = {
        configurable: {
            sessionId: "3",
        },
    };

    const result = await chainWithHistory.invoke(input, options); 
    console.log(result.content);
    console.log(result.response_metadata);
}








