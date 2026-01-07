import UserLevel from "../models/userLevel";
import GuildConfig from "../models/guildConfig";
import { Message, TextChannel } from "discord.js";


export class LevelManager {
    static async addVoiceXp(userId: string, guildId: string, channelId: string, durationMs: number) {
        if (durationMs < 1000) return;

        const guildConfig = await GuildConfig.findOne({ guildId });
        if (guildConfig && guildConfig.ignoredVoiceChannelIds.includes(channelId)) {
            return;
        }

        let userLevel = await UserLevel.findOne({ userId, guildId });
        if (!userLevel) {
            userLevel = new UserLevel({
                userId,
                guildId,
                messageXp: 0,
                messageLevel: 0,
                voiceXp: 0,
                voiceLevel: 0,
                lastMessageDate: new Date()
            });
        }

        const xpGain = Math.floor(durationMs * (10 / 60000));
        if (xpGain <= 0) return;

        userLevel.voiceXp = (userLevel.voiceXp || 0) + xpGain;
        await LevelManager.checkLevelUp(userLevel, null, 'voice');
    }

    static async addXp(userId: string, guildId: string, message: Message) {
        if (message.guild) {
            const guildConfig = await GuildConfig.findOne({ guildId });
            if (guildConfig && guildConfig.ignoredTextChannelIds.includes(message.channel.id)) {
                return;
            }
        }

        let userLevel = await UserLevel.findOne({ userId, guildId });

        if (!userLevel) {
            userLevel = new UserLevel({
                userId,
                guildId,
                messageXp: 0,
                messageLevel: 0,
                voiceXp: 0,
                voiceLevel: 0,
                lastMessageDate: new Date()
            });
        }

        const now = new Date();
        if (userLevel.lastMessageDate) {
            const diff = now.getTime() - userLevel.lastMessageDate.getTime();
            if (diff < 60000 && (userLevel.messageXp || 0) > 0) return;
        }

        userLevel.lastMessageDate = now;

        const xpGain = Math.floor(Math.random() * 11) + 15;
        userLevel.messageXp = (userLevel.messageXp || 0) + xpGain;

        await LevelManager.checkLevelUp(userLevel, message, 'message');
    }

    static async setLevel(userId: string, guildId: string, type: 'text' | 'voice', level: number) {
        let userLevel = await UserLevel.findOne({ userId, guildId });
        if (!userLevel) {
            userLevel = new UserLevel({ userId, guildId });
        }

        const xp = 100 * (level * level);

        if (type === 'text') {
            userLevel.messageLevel = level;
            userLevel.messageXp = xp;
        } else {
            userLevel.voiceLevel = level;
            userLevel.voiceXp = xp;
        }
        await userLevel.save();
    }

    static async resetLevel(userId: string, guildId: string) {
        await UserLevel.deleteOne({ userId, guildId });
    }

    private static async checkLevelUp(userLevel: any, message: Message | null, type: 'message' | 'voice') {
        let currentLevel = 0;
        let currentXp = 0;

        if (type === 'message') {
            currentLevel = userLevel.messageLevel || 0;
            currentXp = userLevel.messageXp || 0;
        } else {
            currentLevel = userLevel.voiceLevel || 0;
            currentXp = userLevel.voiceXp || 0;
        }

        const newLevel = Math.floor(0.1 * Math.sqrt(currentXp));

        if (newLevel > currentLevel) {
            if (type === 'message') {
                userLevel.messageLevel = newLevel;
            } else {
                userLevel.voiceLevel = newLevel;
            }

            if (message && message.channel instanceof TextChannel) {
                try {
                    const typeLabel = type === 'message' ? 'Text' : 'Voice';
                    await message.channel.send(`Congratulations ${message.author}! You have reached **${typeLabel} Level ${newLevel}**!`);
                } catch (e) {
                }
            }
        }

        await userLevel.save();
    }

    static async getUserLevel(userId: string, guildId: string) {
        let userLevel = await UserLevel.findOne({ userId, guildId });
        if (!userLevel) {
            return { messageXp: 0, messageLevel: 0, voiceXp: 0, voiceLevel: 0 };
        }
        return userLevel;
    }
}
