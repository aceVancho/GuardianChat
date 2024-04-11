import { BaseMessageChunk } from "@langchain/core/messages";

type Tool = {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, { type: string; description: string }>;
            required: string[];
        };
    };
};

const toolDefinitions: Record<string, Tool> = {};

function defineTool(tool: Tool) {
    toolDefinitions[tool.function.name] = tool;
}

defineTool({
    type: "function",
    function: {
        name: "user_confirms",
        description: "Determine if user confirms Terms of Service.",
        parameters: {
            type: "object",
            properties: {
                userConfirmsTOS: {
                    type: "boolean",
                    description: "True or false",
                },
            },
            required: ["userConfirmsTOS"],
        },
    },
});

defineTool({
    type: "function",
    function: {
        name: "another_function",
        description: "Description of what this function does.",
        parameters: {
            type: "object",
            properties: {
                someParameter: {
                    type: "string",
                    description: "Description of this parameter.",
                },
            },
            required: ["someParameter"],
        },
    },
});

export const tools: Tool[] = Object.values(toolDefinitions);

const functionMap: Record<string, Function> = {
    user_confirms : (userConfirmsTOS: boolean) => { userAgreementStatus = userConfirmsTOS }
};

export const handleToolCalls = (result: BaseMessageChunk) => {
    if (result.response_metadata.finish_reason === 'tool_calls') {
        const { tool_calls } = result.lc_kwargs.additional_kwargs;

        if (!tool_calls) return;

        tool_calls.forEach((func: any) => {
            const functionName = func.function.name;
            const functionArgs = JSON.parse(func.function.arguments);
            if (functionMap[functionName]) {
                console.log(`Calling... ${functionName}(${func.function.arguments})`)
                functionMap[functionName](functionArgs);
            }
        });
    }
};

let userAgreementStatus = false;