import * as dotenv from "dotenv";
import "./server";
dotenv.config();
import utils from "./utils";
import Discord, { GatewayIntentBits, Events, DMChannel, TextChannel } from "discord.js"
import { generateUsabotMessage } from "./libs/gemini";
const client = new Discord.Client({
    intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ]
});

client.on("ready", () => {
    console.log([
        "Login successful",
        "------------------0------------------",
        "name: " + client.user?.username,
        "id: " + client.user?.id,
        "------------------0------------------",

    ].join("\n"))
})

client.on("messageCreate", async message => {
    if (message.channel instanceof DMChannel) return;
    if (message.author.bot) return;
    if (message.content.startsWith(`<@${client.user?.id}>`) && message.content !== `<@${client.user?.id}>`) {
        try {
            await message.channel.sendTyping();
            const response = await generateUsabotMessage(message, client);
            await message.channel.send(response);
        } catch (e){
            console.error(e)
        }
    }

    const urls = utils.getURLs(message.content);
    const discordURLs = urls.filter(url => url.startsWith("https://discord.com/channels/"));

    if (discordURLs.length > 0) {
        for (const url of urls) {
            const foundMessage = await utils.fetchMessageFromUrl(client, url);

            if (!foundMessage) continue;
            try {
                await utils.sendWebhookMessage(message.channel as TextChannel, {
                    content: foundMessage.content,
                    avatarURL: foundMessage.author.avatarURL() as string,
                    username: foundMessage.author.displayName,
                    files: Array.from(foundMessage.attachments.values()),
                    embeds: foundMessage.embeds
                })
            } catch { }
        }
    }
})

client.login(process.env.DISCORD_TOKEN);