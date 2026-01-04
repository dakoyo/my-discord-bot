import { Client, Message } from "discord.js";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
config();

import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

const prompt = fs.readFileSync(path.join(__dirname, "prompts/main.md"), "utf-8");

export async function generateAIresponse(content: string): Promise<string> {
    const chatCompletion = await groq.chat.completions.create({
        "messages": [
            {
                "role": "system",
                "content": prompt
            },
            {
                "role": "user",
                "content": content
            }
        ],
        "model": "openai/gpt-oss-120b",
        "temperature": 1,
        "max_completion_tokens": 8192,
        "top_p": 1,
        "stream": true,
        "reasoning_effort": "medium",
        "stop": null
    });

    let response = "";
    for await (const chunk of chatCompletion) {
        const content = chunk.choices[0].delta.content;
        if (!content) continue;
        response += content;
    }

    return response;
}
