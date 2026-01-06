import { Connectors, NodeOption, Shoukaku } from "shoukaku";
import { Client } from "discord.js";

const Nodes: NodeOption[] = [{
    name: "Primary Node",
    url: "lavalinkv4.serenetia.com:443",
    auth: "https://dsc.gg/ajidevserver",
    secure: true
}];

class LavalinkManager extends Shoukaku {
    private static instance: LavalinkManager;

    constructor(client: Client) {
        super(new Connectors.DiscordJS(client), Nodes);

        this.on("error", (name, error) => console.error(`[Lavalink] Node ${name} error:`, error));
        this.on("close", (name, code, reason) => console.warn(`[Lavalink] Node ${name} closed with code ${code}. Reason: ${reason || "No reason"}`));
        this.on("disconnect", (name, count) => {
            console.info(`[Lavalink] Node ${name} disconnected. Players: ${count}`);
        });
        this.on("ready", (name) => console.log(`[Lavalink] Node ${name} is now connected`));

        LavalinkManager.instance = this;
    }

    public static getInstance(): LavalinkManager {
        return LavalinkManager.instance;
    }
}

export default LavalinkManager;
