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
export const LANGCHAIN_TRACING_V2 = "true"
export const LANGCHAIN_API_KEY = process.env.OPEN_AI_KEY! 

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const inputPrompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

// ************ LangChain Chat Model ************

// const messages = [
//   new SystemMessage("Your name is Bob and you like rabbits."),
//   new HumanMessage("I am Adam and I like pizza."),
// ];


// const response = await chatModel.invoke(messages);

// console.log(response.content);

// chatModel.generate

// const chatModel = new ChatOpenAI({
//   openAIApiKey: process.env.OPEN_AI_KEY!,
// //   modelName: process.env.CHAT_COMPLETION_MODEL
// });

// const history = new ChatMessageHistory();

// while (true) {
//     const inputText = await inputPrompt('Input:  ')
//     const aiResponse = await chatModel.invoke(inputText);

//     await history.addMessage(new HumanMessage(inputText));
//     await history.addMessage(new AIMessage(aiResponse));

//     console.log(aiResponse.content);

// }

// ************ ZEP TESTING ************
// ************ VectorStore Example ************

// const ZEP_API_KEY = process.env.ZEP_API_KEY!
// const zepClient = await ZepClient.init(ZEP_API_KEY,);
// const vectorStore = await ZepVectorStore.init({
//     client: zepClient,
//     collectionName: 'GuardianChat',
// });

// const retriever = vectorStore.asRetriever();
// const prompt = ChatPromptTemplate.fromMessages([
//     [
//         "system",
//         `Answer the question based only on the following context:
//         {context}`,
//     ],
//     [
//         "human",
//         "{question}"
//     ],
// ]);

// const DEFAULT_DOCUMENT_PROMPT = PromptTemplate.fromTemplate("{pageContent}");

// async function combineDocuments(
//     docs: Document[],
//     documentPrompt: BasePromptTemplate = DEFAULT_DOCUMENT_PROMPT,
//     documentSeparator: string = "\n\n",
// ) {
//     const docStrings: string[] = await Promise.all(
//         docs.map((doc) => {
//             return formatDocument(doc, documentPrompt);
//         }),
//     );
//     return docStrings.join(documentSeparator);
// }

// const outputParser = new StringOutputParser();

// const setupAndRetrieval = RunnableMap.from({
//     context: new RunnableLambda({
//         func: (input: string) =>
//             retriever.invoke(input).then(combineDocuments),
//     }),
//     question: new RunnablePassthrough(),
// });

// const chatModel = new ChatOpenAI({
//   openAIApiKey: process.env.OPEN_AI_KEY!,
// //   modelName: process.env.CHAT_COMPLETION_MODEL
// });

// const chain = setupAndRetrieval
//     .pipe(prompt)
//     .pipe(chatModel)
//     .pipe(outputParser)
//     .withConfig({
//         callbacks: [new ConsoleCallbackHandler()],
//     }); // Optional console callback handler if you want to see input and output of each step in the chain


// while (true) {
//     const inputText = await inputPrompt('Input:  ')
//     const result = await chain.invoke(inputText); // Pass the question as input
//     console.log(result);
// }

// ************ MessageHistory Example ************


// const ZEP_API_KEY = process.env.ZEP_API_KEY!
// const zepClient = await ZepClient.init(ZEP_API_KEY,);

// const prompt = ChatPromptTemplate.fromMessages([
//     ["system", "Answer the user's question below. Be polite and helpful:"],
//     new MessagesPlaceholder("history"),
//     ["human", "{question}"],
// ]);

// const chain = prompt.pipe(
//     new ChatOpenAI({
//         temperature: 0.8,
//         modelName: process.env.CHAT_COMPLETION_MODEL,
//     }),
// );

// const chainWithHistory = new RunnableWithMessageHistory({
//     runnable: chain,
//     getMessageHistory: (sessionId) =>
//         new ZepChatMessageHistory({
//             client: zepClient,
//             sessionId: sessionId,
//             memoryType: "perpetual",
//         }),
//     inputMessagesKey: "question",
//     historyMessagesKey: "history",
// });

// const result = await chainWithHistory.invoke(
//     {
//         question: "How many licks does it take to get to the center of a tootsie pop?",
//     },
//     {
//         configurable: {
//             sessionId: "1",
//         },
//     },
// );

// console.log(result)

/////////
const ZEP_API_KEY = process.env.ZEP_API_KEY!
const zepClient = await ZepClient.init(ZEP_API_KEY,);

const prompt = ChatPromptTemplate.fromMessages([
    ["system", prompts.systemPrompts.systemPrompt1],
    ["system", prompts.systemPrompts.systemPrompt2],
    ["system", prompts.systemPrompts.systemPrompt3],
    ["system", prompts.systemPrompts.systemPrompt4],
    // ["system", 'Here are relevant past conversations: {relevantConversations}'],
    // new MessagesPlaceholder("relevantConversations"),
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
    const result = await chainWithHistory.invoke({
        question: inputText,
    },
    {
        configurable: {
            sessionId: "3",
        },
    },); 
    console.log(result);
}








