
import {
    TextChannel,
    NewsChannel,
    VoiceChannel,
    ForumChannel,
    WebhookClient,
    WebhookMessageCreateOptions,
    Message,
    ChannelType,
    Client
} from "discord.js";

type WebhookCompatibleChannel = TextChannel | NewsChannel | VoiceChannel | ForumChannel;

interface WebhookManagerOptions {
    name: string;
    avatar?: string;
}


class Utils {
    constructor() { };

    public getURLs(content: string): Array<string> {
        const regexp = /https?:\/\/[^\s<>"]+|www\.[^\s<>"]+/g;
        return content.match(regexp) ?? [];
    }

    public async sendWebhookMessage(
        channel: WebhookCompatibleChannel,
        payload: string | WebhookMessageCreateOptions,
        options: WebhookManagerOptions = { name: "Bot Messenger" }
    ): Promise<void> {
        try {
            const webhookClient = await this.getOrCreateWebhook(channel, options);
            await webhookClient.send(payload);
        } catch (error) {
            console.error(`[WebhookManager] Failed to send message to #${channel.name}:`, error);
            throw error;
        }
    }

    private async getOrCreateWebhook(
        channel: WebhookCompatibleChannel,
        options: WebhookManagerOptions
    ): Promise<WebhookClient> {
        const webhooks = await channel.fetchWebhooks();
        const existingWebhook = webhooks.find(wh => wh.name === options.name && wh.token);

        if (existingWebhook) {
            return new WebhookClient({ url: existingWebhook.url });
        }

        const newWebhook = await channel.createWebhook({
            name: options.name,
            avatar: options.avatar,
            reason: "Webhook for Bot Messenger",
        });

        return new WebhookClient({ url: newWebhook.url });
    }
    public async fetchMessageFromUrl(client: Client, url: string): Promise<Message | null> {
        const match = url.match(/channels\/\d+\/(\d+)\/(\d+)/);
        if (!match) {
            return null;
        }

        const [, channelId, messageId] = match;

        try {
            const channel = await client.channels.fetch(channelId);

            if (!channel || channel.type !== ChannelType.GuildText) {
                return null;
            }
            const message = await (channel as TextChannel).messages.fetch(messageId);
            return message;

        } catch (error) {
            return null;
        }
    }
}

export default new Utils();