import * as dotenv from "dotenv";
import "./server";
import { connectDatabase } from "./libs/database";

dotenv.config();
import Discord, { GatewayIntentBits } from "discord.js"
import { onReady } from "./events/ready";
import { onMessageCreate } from "./events/messageCreate";
import { onVoiceStateUpdate } from "./events/voiceStateUpdate";
import CommandManager from "./features/commandManager";
import LavalinkManager from "./libs/LavalinkManager";

const client = new Discord.Client({
    intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ]
});

new LavalinkManager(client);
client.on("clientReady", () => {
    return onReady(client);
});
client.on("messageCreate", (message) => onMessageCreate(client, message));
client.on("voiceStateUpdate", (oldState, newState) => onVoiceStateUpdate(client, oldState, newState));
client.on("interactionCreate", (interaction) => CommandManager.handleInteraction(interaction));



(async () => {
    await connectDatabase();
    client.login(process.env.DISCORD_TOKEN);
})();