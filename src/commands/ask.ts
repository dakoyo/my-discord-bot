import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { generateAIresponse } from "../libs/ai";

const command = new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask a question to the bot")
    .addStringOption((option) =>
        option.setName("question").setDescription("The question to ask").setRequired(true)
    );

const callback = async (interaction: ChatInputCommandInteraction) => {
    try {
        const question = interaction.options.getString("question");
        if (!question) return;
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });
        const response = await generateAIresponse(question);
        await interaction.editReply({
            content: response,
        });
    } catch (e) {
        console.error(e);
    }
};

export { command, callback };