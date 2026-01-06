
import { ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import QueueManager from "../libs/QueueManager";

export const command = new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("自動再生モードを切り替えます")
    .addStringOption(option =>
        option.setName("mode")
            .setDescription("自動再生の有無")
            .addChoices(
                { name: "有効", value: "enable" },
                { name: "無効", value: "disable" }
            )
            .setRequired(true)
    );

export const callback = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand()) return;
    const chatInteraction = interaction as ChatInputCommandInteraction;

    if (!chatInteraction.guildId) return;

    const queue = QueueManager.get(chatInteraction.guildId);
    if (!queue) {
        await chatInteraction.reply({ content: "音楽が再生されていません。", flags: 64 }); // MessageFlags.Ephemeral
        return;
    }

    queue.autoplay = chatInteraction.options.getString("mode", true) === "enable";

    const embed = new EmbedBuilder()
        .setColor(queue.autoplay ? "#00fa9a" : "#dc143c")
        .setDescription(`自動再生を**${queue.autoplay ? "有効" : "無効"}**にしました。`);

    await chatInteraction.reply({ embeds: [embed] });
};
