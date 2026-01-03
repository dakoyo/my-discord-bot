import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";

const command = new SlashCommandBuilder()
    .setName("test")
    .setDescription("Test command");

const callback = (interaction: ChatInputCommandInteraction) => {
    interaction.reply({
        content: "Hello!",
        flags: MessageFlags.Ephemeral
    });
};

export { command, callback };