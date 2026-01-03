import { Client, DMChannel, Message, TextChannel, NewsChannel, ThreadChannel } from "discord.js";
import { generateUsabotMessage } from "../libs/ai";

export async function handleAiChat(client: Client, message: Message) {
    if (message.channel instanceof DMChannel) return;
    if (message.author.bot) return;

    if (message.content.startsWith(`<@${client.user?.id}>`) && message.content !== `<@${client.user?.id}>`) {
        try {
            const channel = message.channel as TextChannel | NewsChannel | ThreadChannel;
            await channel.sendTyping();
            const response = await generateUsabotMessage(message, client);
            await channel.send(response);
        } catch (e) {
            console.error(e);
        }
    }
}