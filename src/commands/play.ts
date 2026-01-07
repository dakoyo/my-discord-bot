
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, CommandInteraction, ComponentType, EmbedBuilder, GuildMember, GuildTextBasedChannel, MessageFlags, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, StringSelectMenuInteraction } from "discord.js";
import LavalinkManager from "../libs/LavalinkManager";
import QueueManager from "../libs/QueueManager";
import { LoadType } from "shoukaku";

export const command = new SlashCommandBuilder()
    .setName("play")
    .setDescription("曲を再生する")
    .addStringOption(option =>
        option.setName("query")
            .setDescription("再生する曲の名前またはURL")
            .setRequired(true)
    );

export const callback = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand()) return;
    const chatInteraction = interaction as ChatInputCommandInteraction;

    const query = chatInteraction.options.getString("query", true);
    const member = chatInteraction.member as GuildMember;

    if (!member.voice.channelId) {
        await chatInteraction.reply({ content: "音楽を再生するにはボイスチャンネルに参加してください。", flags: MessageFlags.Ephemeral });
        return;
    }

    const lavalink = LavalinkManager.getInstance();
    if (!lavalink) {
        await chatInteraction.reply({ content: "Lavalinkの準備ができていません。", flags: MessageFlags.Ephemeral });
        return;
    }

    const node = lavalink.options.nodeResolver(lavalink.nodes);
    if (!node) {
        await chatInteraction.reply({ content: "利用可能なLavalinkノードがありません。", flags: MessageFlags.Ephemeral });
        return;
    }

    const isUrl = /^(http|https):\/\/[^ "]+$/.test(query);

    let trackToPlay;

    if (!isUrl) {
        await chatInteraction.deferReply({
            flags: MessageFlags.Ephemeral
        });
        let currentPlatform = "ytsearch";
        const platforms: Record<string, { color: string, label: string }> = {
            "spsearch": { color: "#1DB954", label: "Spotify" },
            "ytsearch": { color: "#FF0000", label: "YouTube" },
            "ytmsearch": { color: "#FF0000", label: "YouTube Music" },
        };

        const performSearch = async () => {
            try {
                const searchResult = await node.rest.resolve(`${currentPlatform}:${query}`);
                if (!searchResult || searchResult.loadType === LoadType.EMPTY || searchResult.loadType === LoadType.ERROR || !searchResult.data) {
                    return null;
                }
                const tracks = (searchResult.data as any);
                return Array.isArray(tracks) ? tracks.slice(0, 5) : [tracks];
            } catch (error) {
                console.error("[Play Command] Search Error:", error);
                return null;
            }
        };

        let top5 = await performSearch();
        if (!top5 || top5.length === 0) {
            await chatInteraction.editReply({ content: "検索結果が見つかりませんでした (またはエラーが発生しました)。" });
            return;
        }

        const generateComponents = (isList: boolean) => {
            const platformSelect = new StringSelectMenuBuilder()
                .setCustomId("platform_select")
                .setPlaceholder("検索プラットフォームを選択")
                .addOptions(
                    Object.keys(platforms).map(key =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(platforms[key].label)
                            .setValue(key)
                            .setDefault(key === currentPlatform)
                    )
                );

            const rowSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(platformSelect);

            if (isList) {
                const listButtons = top5!.map((_: any, index: number) =>
                    new ButtonBuilder().setCustomId(`search_select_${index}`).setLabel(`${index + 1}`).setStyle(ButtonStyle.Primary)
                );
                const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(listButtons.slice(0, 5));
                const rowControl = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("search_back").setLabel("トップに戻る").setStyle(ButtonStyle.Secondary)
                );
                return [rowSelect, rowButtons, rowControl];
            } else {
                const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("search_play").setLabel("再生").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("search_more").setLabel("他の候補を見る").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("search_cancel").setLabel("キャンセル").setStyle(ButtonStyle.Danger)
                );
                return [rowSelect, rowButtons];
            }
        };

        const generateEmbed = (track: any, isList: boolean) => {
            if (isList) {
                return new EmbedBuilder()
                    .setColor(platforms[currentPlatform].color as any)
                    .setTitle("検索結果")
                    .setDescription(top5!.map((t: any, index: number) => `**${index + 1}.** [${t.info.title}](${t.info.uri})`).join("\n"))
                    .setFooter({ text: `Source: ${platforms[currentPlatform].label}` });
            } else {
                return new EmbedBuilder()
                    .setColor(platforms[currentPlatform].color as any)
                    .setTitle("検索結果 (トップ)")
                    .setDescription(`[${track.info.title}](${track.info.uri})`)
                    .setThumbnail(track.info.artworkUrl || null)
                    .addFields(
                        { name: "アーティスト", value: track.info.author, inline: true },
                        { name: "長さ", value: formatDuration(track.info.length), inline: true }
                    )
                    .setFooter({ text: `Source: ${platforms[currentPlatform].label}` });
            }
        };

        let currentView: "top" | "list" = "top";

        const response = await chatInteraction.editReply({
            embeds: [generateEmbed(top5[0], false)],
            components: generateComponents(false) as any,
        });

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async (i) => {
            if (i.isStringSelectMenu()) {
                await i.deferUpdate();
                currentPlatform = i.values[0];
                top5 = await performSearch();
                if (!top5 || top5.length === 0) {
                    await i.editReply({ content: "このプラットフォームでは結果が見つかりませんでした (またはエラーが発生しました)。", embeds: [], components: [] });
                    return;
                }
                currentView = "top";
                await i.editReply({
                    embeds: [generateEmbed(top5[0], false)],
                    components: generateComponents(false) as any
                });
            } else if (i.isButton()) {
                if (i.customId === "search_play") {
                    trackToPlay = top5![0];
                    await i.update({ content: `選択中: **${trackToPlay.info.title}**`, embeds: [], components: [] });
                    collector.stop("selected");
                } else if (i.customId === "search_cancel") {
                    await i.update({ content: "検索をキャンセルしました。", embeds: [], components: [] });
                    collector.stop("cancelled");
                } else if (i.customId === "search_more") {
                    currentView = "list";
                    await i.update({
                        embeds: [generateEmbed(null, true)],
                        components: generateComponents(true) as any
                    });
                } else if (i.customId === "search_back") {
                    currentView = "top";
                    await i.update({
                        embeds: [generateEmbed(top5![0], false)],
                        components: generateComponents(false) as any
                    });
                } else if (i.customId.startsWith("search_select_")) {
                    const index = parseInt(i.customId.split("_")[2]);
                    trackToPlay = top5![index];
                    await i.update({ content: `選択中: **${trackToPlay.info.title}**`, embeds: [], components: [] });
                    collector.stop("selected");
                }
            }
        });

        await new Promise<void>((resolve) => {
            collector.on('end', (_, reason) => {
                resolve();
            });
        });

        if (!trackToPlay) {
            return;
        }

    } else {
        await chatInteraction.deferReply();
        let result;
        try {
            result = await node.rest.resolve(query);
        } catch (error) {
            console.error("[Play Command] URL Resolve Error:", error);
            await chatInteraction.editReply("読み込み中にエラーが発生しました。");
            return;
        }

        if (!result || result.loadType === LoadType.EMPTY || result.loadType === LoadType.ERROR) {
            await chatInteraction.editReply("検索結果が見つかりませんでした (または読み込み失敗)。");
            return;
        }

        if (result.loadType === LoadType.PLAYLIST) {
            trackToPlay = (result.data as any).tracks[0];
        } else {
            trackToPlay = result.data as any;
            if (Array.isArray(trackToPlay)) trackToPlay = trackToPlay[0];
        }
    }

    console.log("[Play Command] Track: ", trackToPlay.info.title);

    if (trackToPlay) {
        (trackToPlay as any).userData = { ...(trackToPlay as any).userData, requester: interaction.user.id };
    }

    let player = lavalink.players.get(member.guild.id);
    if (!player) {
        player = await lavalink.joinVoiceChannel({
            guildId: member.guild.id,
            channelId: member.voice.channelId,
            shardId: 0,
            deaf: true
        });
    }

    let queue = QueueManager.get(member.guild.id);
    if (!queue) {
        queue = QueueManager.create(member.guild.id, player, chatInteraction.channel as GuildTextBasedChannel);
    }

    queue.player = player;
    queue.textChannel = chatInteraction.channel as GuildTextBasedChannel;

    queue.push(trackToPlay as any);

    const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setDescription(`[${trackToPlay.info.title}](${trackToPlay.info.uri}) を<@${interaction.user.id}>がキューに追加しました。`)
        .setThumbnail(trackToPlay.info.artworkUrl || null);

    if (chatInteraction.deferred) {
        await chatInteraction.editReply({ content: null, embeds: [embed] });
    }
    await (chatInteraction.channel as GuildTextBasedChannel)?.send({ embeds: [embed] });

    if (!queue.current) {
        await queue.playNext();
    }
};

function formatDuration(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    return [
        hours > 0 ? hours : null,
        minutes,
        seconds < 10 ? `0${seconds}` : seconds
    ].filter(Boolean).join(":");
}
