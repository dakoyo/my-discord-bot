
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, CommandInteraction, MessageFlags } from "discord.js";
import { LevelManager } from "../features/levelManager";

export const command = new SlashCommandBuilder()
    .setName("rank")
    .setDescription("ユーザーのランクを表示します")
    .addUserOption(option => option.setName("user").setDescription("ユーザーを指定します").setRequired(false));

export const callback = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
        if (interaction.isRepliable()) {
            await interaction.reply({ content: "このコマンドはサーバー内でしか使えません", ephemeral: true });
        }
        return;
    }

    const user = interaction.options.getUser("user") || interaction.user;
    if (user.bot) {
        if (interaction.isRepliable()) {
            await interaction.reply({ content: "ボットのランクは表示できません", flags: MessageFlags.Ephemeral });
        }
        return;
    }

    const userLevel = await LevelManager.getUserLevel(user.id, interaction.guild.id);

    const getLevelData = (xp: number, level: number) => {
        const currentLevel = level;
        const currentXp = xp;
        const nextLevel = currentLevel + 1;
        const xpForNextLevel = 100 * (nextLevel * nextLevel);
        const xpForCurrentLevel = 100 * (currentLevel * currentLevel);

        const xpIntoLevel = currentXp - xpForCurrentLevel;
        const xpToCompleteLevel = xpForNextLevel - xpForCurrentLevel;

        const progressPercent = Math.floor((xpIntoLevel / xpToCompleteLevel) * 100);
        return {
            level: currentLevel,
            currentXp,
            nextLevelXp: xpForNextLevel,
            progress: progressPercent > 100 ? 100 : (progressPercent < 0 ? 0 : progressPercent) // simple clamp
        };
    };

    const textData = getLevelData(userLevel.messageXp || 0, userLevel.messageLevel || 0);
    const voiceData = getLevelData(userLevel.voiceXp || 0, userLevel.voiceLevel || 0);

    const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`${user.username}'s Rank`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            { name: "テキストレベル", value: `**${textData.level}**\nXP: ${textData.currentXp} / ${textData.nextLevelXp}\n${createProgressBar(textData.progress)} ${textData.progress}%`, inline: false },
            { name: "ボイスレベル", value: `**${voiceData.level}**\nXP: ${voiceData.currentXp} / ${voiceData.nextLevelXp}\n${createProgressBar(voiceData.progress)} ${voiceData.progress}%`, inline: false }
        );

    if (interaction.isRepliable()) {
        await interaction.reply({ embeds: [embed] });
    }
};

function createProgressBar(percent: number, size: number = 20): string {
    const progress = Math.round((percent / 100) * size);
    const emptyProgress = size - progress;

    const progressText = '▇'.repeat(progress);
    const emptyProgressText = '—'.repeat(emptyProgress);

    return `[${progressText}${emptyProgressText}]`;
}
