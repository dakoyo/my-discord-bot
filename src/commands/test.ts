import { CommandInteraction, SlashCommandBuilder } from "discord.js";

const command = new SlashCommandBuilder()
    .setName("test")
    .setDescription("Test command");

const callback = (interaction: CommandInteraction) => {
    interaction.reply({
        content: "Hello!",
        ephemeral: true
    });
};

export { command, callback };