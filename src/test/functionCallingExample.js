import OpenAI from "openai";
import readline from 'readline';
const openai = new OpenAI();

const getWeather = {
    type: "function",
    function: {
        "name": "get_weather",
        "description": "Get the weather forecast based on the given location and date",
        "parameters": {
            "type": "object",
            "properties": {
            "location": {
                "type": "string",
                "description": "Location or place name"
            },
            "date": {
                "type": "string",
                "description": "Date of forecast in 'YYYY-MM-DD' format"
                }
            },
            "required": [
            "location",
            "date"
            ]
        }
    }
}

const userConfirms = {
    type: "function",
    function: {
        "name": "user_confirms",
        "description": "Determine if user confirms Terms of Service.",
        "parameters": {
            "type": "object",
            "properties": {
            "userConfirmsTOS": {
                "type": "boolean",
                "description": "True or false"
            }},
            "required": ["userConfirmsTOS",]
        }
    }
}

const inputPrompt = (question) => new Promise((resolve) => rl.question(question, resolve));
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
// const inputText = await inputPrompt('Input: ')


const result = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
        // {role: 'user', content: 'What is weather like in Birmingham, AL.'},
        {role: 'assistant', content: 'Do you agree to the TOS?'},
        {role: 'user', content: 'No. Your terms invade my privacy.'},
        {role: 'user', content: 'Tell me a joke.'}
    ],
    tools: [getWeather, userConfirms]
})
console.log(result.choices[0].message)
console.log(result.choices[0].message.tool_calls)