import * as dotenv from "dotenv";
import "./server";
dotenv.config();
import Discord, { GatewayIntentBits } from "discord.js"
import { onReady } from "./events/ready";
import { onMessageCreate } from "./events/messageCreate";
import CommandManager from "./features/commandManager";

const client = new Discord.Client({
    intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ]
});

client.on("ready", () => onReady(client));
client.on("messageCreate", (message) => onMessageCreate(client, message));
client.on("interactionCreate", (interaction) => CommandManager.handleInteraction(interaction));

client.login(process.env.DISCORD_TOKEN);