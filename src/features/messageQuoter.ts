import { ChannelType, Client, EmbedBuilder, Message, TextChannel } from "discord.js";
import utils from "../utils";

export async function handleMessageQuoter(client: Client, message: Message) {
    const urls = utils.getURLs(message.content);
    const discordURLs = urls.filter(url => url.startsWith("https://discord.com/channels/"));

    if (discordURLs.length > 0) {
        for (const url of urls) {
            const foundMessage = await utils.fetchMessageFromUrl(client, url);

            if (!foundMessage) continue;
            try {
                if (message.channel.type === ChannelType.GuildText) {
                    await utils.sendWebhookMessage(message.channel as TextChannel, {
                        content: foundMessage.content,
                        avatarURL: foundMessage.author.avatarURL() as string,
                        username: foundMessage.author.displayName,
                        files: Array.from(foundMessage.attachments.values()),
                        embeds: foundMessage.embeds
                    });
                } else if (message.channel.isSendable()) {
                    const embeds: EmbedBuilder[] = [];

                    const authorEmbed = new EmbedBuilder();
                    authorEmbed.setAuthor({
                        name: foundMessage.author.displayName,
                        iconURL: foundMessage.author.avatarURL() as string
                    });
                    embeds.push(authorEmbed);

                    if (foundMessage.content.length > 0) {
                        const messageEmbed = new EmbedBuilder();
                        messageEmbed.setDescription(foundMessage.content);
                        embeds.push(messageEmbed);
                    }

                    await message.channel.send({
                        files: Array.from(foundMessage.attachments.values()),
                        embeds: [...embeds, ...foundMessage.embeds]
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }
    }
}
