import { Client, Message } from "discord.js";
import { handleAiChat } from "../features/aiChat";
import { handleMessageQuoter } from "../features/messageQuoter";
import { LevelManager } from "../features/levelManager";


export async function onMessageCreate(client: Client, message: Message) {
    if (message.author.bot) return;

    await handleAiChat(client, message);
    await handleMessageQuoter(client, message);

    if (message.guild) {
        await LevelManager.addXp(message.author.id, message.guild.id, message);
    }
}

