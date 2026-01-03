import { Client, Message } from "discord.js";
import { handleAiChat } from "../features/aiChat";
import { handleMessageQuoter } from "../features/messageQuoter";

export async function onMessageCreate(client: Client, message: Message) {
    if (message.author.bot) return;

    await handleAiChat(client, message);
    await handleMessageQuoter(client, message);
}
