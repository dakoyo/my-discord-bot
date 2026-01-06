
import { ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import QueueManager from "../libs/QueueManager";

export const command = new SlashCommandBuilder()
    .setName("skip")
    .setDescription("現在の曲をスキップする");

export const callback = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand()) return;
    const chatInteraction = interaction as ChatInputCommandInteraction;

    await chatInteraction.deferReply();
    const member = chatInteraction.member as GuildMember;

    if (!member.voice.channelId) {
        await chatInteraction.editReply("このコマンドを使用するにはボイスチャンネルに参加してください。");
        return;
    }

    const queue = QueueManager.get(member.guild.id);
    if (!queue || !queue.current) {
        await chatInteraction.editReply("スキップする曲がありません。");
        return;
    }

    if (!queue.current) {
        await chatInteraction.editReply("再生中の曲がありません。");
        return;
    }

    const skippedTrack = queue.current;
    await queue.player.stopTrack();

    const embed = new EmbedBuilder()
        .setColor("#ffd700")
        .setDescription(`[${skippedTrack.info.title}](${skippedTrack.info.uri}) をスキップしました。`);

    await chatInteraction.editReply({ embeds: [embed] });
};
