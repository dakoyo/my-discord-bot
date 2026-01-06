
import {
    Client,
    REST,
    Routes,
    Collection,
    CommandInteraction,
    SlashCommandBuilder,
    Interaction
} from "discord.js";
import * as fs from "fs";
import * as path from "path";

export interface Command {
    command: SlashCommandBuilder;
    callback: (interaction: CommandInteraction) => Promise<void> | void;
}

class CommandManager {
    private commands: Collection<string, Command> = new Collection();

    constructor() { }

    public async loadCommands() {
        const commandsPath = path.join(__dirname, "../commands");
        if (!fs.existsSync(commandsPath)) {
            console.warn(`[CommandManager] Commands directory not found at ${commandsPath}`);
            return;
        }

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js") || file.endsWith(".ts"));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const commandModule = await import(filePath);
                if (commandModule.command && commandModule.callback) {
                    this.commands.set(commandModule.command.name, {
                        command: commandModule.command,
                        callback: commandModule.callback
                    });
                    console.log(`[CommandManager] Loaded command: ${commandModule.command.name}`);
                } else {
                    console.warn(`[CommandManager] The command at ${filePath} is missing a required "command" or "callback" export.`);
                }
            } catch (error) {
                console.error(`[CommandManager] Error loading command ${file}:`, error);
            }
        }
    }

    public async registerCommands(client: Client) {
        if (!client.user) {
            console.error("[CommandManager] Client user is not defined. Cannot register commands.");
            return;
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
        const commandData = this.commands.map(cmd => cmd.command.toJSON());

        try {
            console.log(`[CommandManager] Started refreshing ${commandData.length} application (/) commands.`);

            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandData },
            );

            console.log(`[CommandManager] Successfully reloaded application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    }

    public async handleInteraction(interaction: Interaction) {
        if (!interaction.isCommand()) return;
        if (!interaction.isChatInputCommand()) return;

        const command = this.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[CommandManager] No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.callback(interaction);
        } catch (error) {
            console.error(error);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            } catch { }
        }
    }
}

export default new CommandManager();
