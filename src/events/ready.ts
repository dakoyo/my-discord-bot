import { Client } from "discord.js";
import CommandManager from "../features/commandManager";

export async function onReady(client: Client) {
    console.log([
        "Login successful",
        "------------------0------------------",
        "name: " + client.user?.username,
        "id: " + client.user?.id,
        "------------------0------------------",
    ].join("\n"));

    await CommandManager.loadCommands();
    await CommandManager.registerCommands(client);
}
