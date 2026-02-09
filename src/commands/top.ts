
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
    await interaction.deferReply();

    const guildId = interaction.guild.id;
    const query = { guildId };

    const [topText, topVoice] = await Promise.all([
        UserLevel.find(query).sort({ messageLevel: -1, messageXp: -1 }).limit(5),
        UserLevel.find(query).sort({ voiceLevel: -1, voiceXp: -1 }).limit(5)
    ]);

    if (topText.length === 0 && topVoice.length === 0) {
        await interaction.editReply({ content: "データがありませんでした" });
        return;
    }

    const userIds = new Set<string>();
    topText.forEach(u => userIds.add(u.userId));
    topVoice.forEach(u => userIds.add(u.userId));

    let membersMap = new Map<string, any>();
    if (userIds.size > 0) {
        try {
            const fetchedMembers = await interaction.guild.members.fetch({ user: Array.from(userIds) });
            fetchedMembers.forEach(member => membersMap.set(member.id, member));
        } catch (e) {
            console.error("Failed to batch fetch members", e);
        }
    }

    const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`${interaction.guild.name} ランキング`)
        .setTimestamp();

    const formatList = (users: any[], levelField: string, xpField: string) => {
        let description = "";
        if (users.length === 0) return "データがまだありません";

        for (const [index, userLevel] of users.entries()) {
            const userId = userLevel.userId;
            const level = userLevel[levelField] || 0;

            let memberName = "Unknown User";
            const member = membersMap.get(userId);
            if (member) {
                memberName = member.user.username;
            } else {

            }

            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
            description += `${medal} **${memberName}** — Lv **${level}** \n`;
        }
        return description;
    };

    const textDescription = formatList(topText, "messageLevel", "messageXp");
    const voiceDescription = formatList(topVoice, "voiceLevel", "voiceXp");

    embed.addFields(
        { name: "テキストトップ5", value: textDescription, inline: true },
        { name: "ボイストップ5", value: voiceDescription, inline: true }
    );

    if (interaction.isRepliable()) {
        await interaction.editReply({ embeds: [embed] });
    }
};
