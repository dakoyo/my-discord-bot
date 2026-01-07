
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import UserLevel from "../models/userLevel";

export const command = new SlashCommandBuilder()
    .setName("top")
    .setDescription("ユーザーのランクを表示します");

export const callback = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) {
        if (interaction.isRepliable()) {
            await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
        }
        return;
    }

    const guildId = interaction.guild.id;
    const query = { guildId };

    const topText = await UserLevel.find(query).sort({ messageLevel: -1, messageXp: -1 }).limit(5);

    const topVoice = await UserLevel.find(query).sort({ voiceLevel: -1, voiceXp: -1 }).limit(5);

    if (topText.length === 0 && topVoice.length === 0) {
        await interaction.reply({ content: "データがありませんでした", ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`${interaction.guild.name} ランキング`)
        .setTimestamp();

    const formatList = async (users: any[], levelField: string, xpField: string) => {
        let description = "";
        if (users.length === 0) return "データがまだありません";

        for (const [index, userLevel] of users.entries()) {
            const userId = userLevel.userId;
            const level = userLevel[levelField] || 0;
            const xp = userLevel[xpField] || 0;

            let memberName = userId;
            try {
                const member = await interaction.guild!.members.fetch(userId);
                memberName = member.user.username;
            } catch (e) {
                memberName = "Unknown User";
            }

            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
            description += `${medal} **${memberName}** — Lv **${level}** \n`;
        }
        return description;
    };

    const textDescription = await formatList(topText, "messageLevel", "messageXp");
    const voiceDescription = await formatList(topVoice, "voiceLevel", "voiceXp");

    embed.addFields(
        { name: "テキストトップ5", value: textDescription, inline: true },
        { name: "ボイストップ5", value: voiceDescription, inline: true }
    );

    if (interaction.isRepliable()) {
        await interaction.reply({ embeds: [embed] });
    }
};
