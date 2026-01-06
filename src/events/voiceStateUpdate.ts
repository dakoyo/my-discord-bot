
import { Client, VoiceState } from "discord.js";
import LavalinkManager from "../libs/LavalinkManager";
import QueueManager from "../libs/QueueManager";

const emptyChannelTimeouts = new Map<string, NodeJS.Timeout>();

export const onVoiceStateUpdate = async (client: Client, oldState: VoiceState, newState: VoiceState) => {
    const guildId = oldState.guild.id;
    const botId = client.user?.id;

    if (!botId) return;

    const botVoiceState = oldState.guild.members.cache.get(botId)?.voice;

    if (!botVoiceState || !botVoiceState.channelId) {
        if (emptyChannelTimeouts.has(guildId)) {
            clearTimeout(emptyChannelTimeouts.get(guildId)!);
            emptyChannelTimeouts.delete(guildId);
        }
        return;
    }

    const channel = botVoiceState.channel;
    if (!channel) return;
    const nonBotMembers = channel.members.filter(m => !m.user.bot);

    if (nonBotMembers.size === 0) {
        if (!emptyChannelTimeouts.has(guildId)) {
            console.log(`[VoiceState] Channel empty in guild ${guildId}. Starting disconnect timer.`);
            const timeout = setTimeout(async () => {
                console.log(`[VoiceState] Disconnect timer expired for guild ${guildId}. Leaving.`);
                const lavalink = LavalinkManager.getInstance();
                await lavalink.leaveVoiceChannel(guildId);
                QueueManager.destroy(guildId);
                emptyChannelTimeouts.delete(guildId);
            }, 1000);
            emptyChannelTimeouts.set(guildId, timeout);
        }
    } else {
        if (emptyChannelTimeouts.has(guildId)) {
            console.log(`[VoiceState] Channel not empty in guild ${guildId}. Clearing disconnect timer.`);
            clearTimeout(emptyChannelTimeouts.get(guildId)!);
            emptyChannelTimeouts.delete(guildId);
        }
    }
};
