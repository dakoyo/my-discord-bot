
import { ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import QueueManager from "../libs/QueueManager";
import LavalinkManager from "../libs/LavalinkManager";

export const command = new SlashCommandBuilder()
    .setName("stop")
    .setDescription("再生を停止し、キューをクリアする");

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
    if (queue) {
        queue.stopping = true;
        queue.queue = [];
        queue.current = null;
        await queue.player.stopTrack();
        const lavalink = LavalinkManager.getInstance();
        await lavalink.leaveVoiceChannel(member.guild.id);
        QueueManager.destroy(member.guild.id);

        const embed = new EmbedBuilder()
            .setColor("#dc143c")
            .setDescription("再生を停止し、キューをクリアしました。");

        await chatInteraction.editReply({ embeds: [embed] });
    } else {
        await chatInteraction.editReply("このサーバーでは何も再生していません。");
    }
};
