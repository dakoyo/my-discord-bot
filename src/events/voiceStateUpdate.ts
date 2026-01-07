
import { Client, VoiceState } from "discord.js";
import LavalinkManager from "../libs/LavalinkManager";
import QueueManager from "../libs/QueueManager";
import { LevelManager } from "../features/levelManager";

const emptyChannelTimeouts = new Map<string, NodeJS.Timeout>();
const voiceJoinTimes = new Map<string, number>();

export const onVoiceStateUpdate = async (client: Client, oldState: VoiceState, newState: VoiceState) => {
    const guildId = oldState.guild.id || newState.guild.id;
    const userId = oldState.member?.id || newState.member?.id;

    if (!userId) return;

    const key = `${guildId}-${userId}`;
    const now = Date.now();

    const wasEligible = oldState.channelId && !oldState.member?.user.bot && !oldState.serverMute && !oldState.selfMute && !oldState.serverDeaf && !oldState.selfDeaf;
    const isEligible = newState.channelId && !newState.member?.user.bot && !newState.serverMute && !newState.selfMute && !newState.serverDeaf && !newState.selfDeaf;

    const hasJoinTime = voiceJoinTimes.has(key);
    const channelChanged = oldState.channelId !== newState.channelId;

    if (hasJoinTime && (!isEligible || channelChanged)) {
        const joinTime = voiceJoinTimes.get(key)!;
        const duration = now - joinTime;
        voiceJoinTimes.delete(key);

        if (oldState.channelId) {
            await LevelManager.addVoiceXp(userId, guildId, oldState.channelId, duration);
        }
    }

    if (isEligible) {
        // If we assumed tracking stopped (deleted key above) or wasn't tracking, start/restart tracking.
        // Note: if channelChanged was true, we deleted key above. So we set new key here. Correct.
        if (!voiceJoinTimes.has(key)) {
            voiceJoinTimes.set(key, now);
        }
    }


    // --- Existing Bot Auto-Leave Logic ---
    const botId = client.user?.id;
    if (!botId) return;

    const botVoiceState = (newState.guild.members.cache.get(botId) || oldState.guild.members.cache.get(botId))?.voice;

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
            }, 60000); // 1 minute
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
