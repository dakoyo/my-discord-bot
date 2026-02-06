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
client.on(Discord.Events.ClientReady, () => {
    return onReady(client);
});
client.on(Discord.Events.MessageCreate, (message) => onMessageCreate(client, message));
client.on(Discord.Events.VoiceStateUpdate, (oldState, newState) => onVoiceStateUpdate(client, oldState, newState));
client.on(Discord.Events.InteractionCreate, (interaction) => CommandManager.handleInteraction(interaction));

// Debugging events
client.on(Discord.Events.Debug, (info) => console.log(`[DEBUG] ${info}`));
client.on(Discord.Events.Error, (error) => console.error(`[ERROR] ${error.message}`));

(async () => {
    try {
        await connectDatabase();

        const token = process.env.DISCORD_TOKEN;
        if (!token) {
            console.error("[CRITICAL] DISCORD_TOKEN is missing in environment variables!");
        } else {
            console.log(`[INFO] DISCORD_TOKEN is present (Length: ${token.length})`);
        }

        console.log("[INFO] Attempting to log in...");
        const tokenStr = await client.login(token);
        console.log("[INFO] client.login() promise resolved. Token used.");
    } catch (err) {
        console.error("[FATAL] Error during startup:", err);
    }
})();