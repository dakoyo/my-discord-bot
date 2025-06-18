import { Client, Message } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
config();


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;
if (!GEMINI_API_KEY || !GEMINI_MODEL) {
    console.error("GEMINI_API_KEYまたはGEMINI_MODELが設定されていません。");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: fs.readFileSync(path.resolve(__dirname, "./prompts/usabot.md"), "utf-8")});

export async function generateUsabotMessage(message: Message, client: Client): Promise<string> {
    const result = await geminiModel.generateContent(message.content.replace(`<@${client.user?.id}>`, ""));
    return result.response.text();
}