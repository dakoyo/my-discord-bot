import { Player, Track } from "shoukaku";
import { EmbedBuilder, GuildTextBasedChannel, TextBasedChannel } from "discord.js";
import LavalinkManager from "./LavalinkManager";

export class Queue {
    public player: Player;
    public queue: Track[] = [];
    public current: Track | null = null;
    public textChannel: GuildTextBasedChannel | null = null;
    public disconnectTimeout: NodeJS.Timeout | null = null;
    public autoplay: boolean = false;
    public stopping: boolean = false;
    public history: string[] = [];

    constructor(player: Player, textChannel?: GuildTextBasedChannel) {
        this.player = player;
        this.textChannel = textChannel || null;

        this.player.on("start", (data) => {
            console.log("[Queue] Track started", data.track.info.title);

            if (this.current) {
                this.history.push(this.current.info.identifier);
                if (this.history.length > 20) {
                    this.history.shift();
                }
            }

            if (this.disconnectTimeout) {
                clearTimeout(this.disconnectTimeout);
                this.disconnectTimeout = null;
            }

            if (this.current && this.textChannel) {
                const embed = new EmbedBuilder()
                    .setColor("#7fffd4")
                    .setTitle("再生中")
                    .setDescription(`[${this.current.info.title}](${this.current.info.uri})`)
                    .setThumbnail(this.current.info.artworkUrl || null)
                    .addFields(
                        { name: "アーティスト", value: this.current.info.author, inline: true },
                        { name: "長さ", value: this.formatDuration(this.current.info.length), inline: true },
                        { name: "自動再生", value: this.autoplay ? "有効" : "無効", inline: true }
                    );

                const requesterId = ((this.current as any).userData as any)?.requester;
                if (requesterId) {
                    embed.addFields({ name: "リクエスト", value: `<@${requesterId}>`, inline: true });
                }

                this.textChannel.send({ embeds: [embed] }).catch(console.error);
            }
        });

        this.player.on("end", async (data) => {
            console.log("[Queue] Track ended", data.track.info.title);
            if (data.reason === "replaced") return;
            if (data.reason === "loadFailed") {
                console.error("[Queue] Track load failed");
                if (this.textChannel) {
                    this.textChannel.send("読み込みに失敗しました。スキップします...").catch(console.error);
                }
            }
            await this.playNext();
        });

        this.player.on("exception", (error) => {
            console.error("[Queue] Track exception", error);
            if (this.textChannel) {
                this.textChannel.send(`再生エラー: ${error.exception.message}`).catch(console.error);
            }
            this.playNext();
        });

        this.player.on("closed", (data) => {
            console.log("[Queue] Player closed", data);
            if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
            QueueManager.getInstance().destroy(this.player.guildId);
        });
    }

    private formatDuration(ms: number): string {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

        return [
            hours > 0 ? hours : null,
            minutes,
            seconds < 10 ? `0${seconds}` : seconds
        ].filter(Boolean).join(":");
    }

    public async playNext() {
        if (this.queue.length === 0) {
            if (this.autoplay && this.current) {
                try {
                    const previousTrack = this.current;
                    const lavalink = LavalinkManager.getInstance();
                    const node = lavalink.options.nodeResolver(lavalink.nodes);

                    if (node) {
                        let videoId = previousTrack.info.identifier;

                        if (previousTrack.info.sourceName !== "youtube" && previousTrack.info.sourceName !== "youtube_music") {
                            const searchRes = await node.rest.resolve(`ytsearch:${previousTrack.info.title} ${previousTrack.info.author}`);
                            if (searchRes?.data && (searchRes.loadType === 'search' || searchRes.loadType === 'track')) {
                                const tracks = Array.isArray(searchRes.data) ? searchRes.data : (searchRes.data as any).tracks;
                                if (tracks && tracks.length > 0) {
                                    videoId = (tracks[0] as Track).info.identifier;
                                }
                            }
                        }

                        const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
                        const result = await node.rest.resolve(mixUrl);

                        if (result && result.data && (result.loadType === 'playlist' || result.loadType === 'search')) {
                            // result.data is PlaylistObject | TrackObject[]
                            let tracks: Track[] = [];
                            if (Array.isArray(result.data)) {
                                tracks = result.data as unknown as Track[];
                            } else {
                                tracks = (result.data as any).tracks as Track[];
                            }

                            if (tracks.length > 0) {
                                let nextTrack: Track | undefined;

                                // Find the first track not in history
                                for (const track of tracks) {
                                    if (!this.history.includes(track.info.identifier) && track.info.identifier !== previousTrack.info.identifier) {
                                        nextTrack = track;
                                        break;
                                    }
                                }

                                // Fallback: if all are in history, just pick the 2nd one (index 1) or random?
                                // Let's fallback to index 1 or random if index 1 is current/previous
                                if (!nextTrack && tracks.length > 1) {
                                    nextTrack = tracks[1];
                                }

                                if (nextTrack) {
                                    (nextTrack as any).userData = { requester: null };

                                    this.queue.push(nextTrack);

                                    if (this.textChannel) {
                                        const embed = new EmbedBuilder()
                                            .setColor("#00fa9a")
                                            .setDescription(`自動再生: [${nextTrack.info.title}](${nextTrack.info.uri}) を追加しました。`);
                                        this.textChannel.send({ embeds: [embed] }).catch(console.error);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("[Queue] Autoplay error:", error);
                }
            }
        }

        if (this.queue.length === 0) {
            if (this.stopping) return;

            this.current = null;
            await this.player.stopTrack();
            console.log("[Queue] Queue empty, stopping.");
            const embed = new EmbedBuilder()
                .setTitle("キューが空になりました")
                .setDescription("まもなく切断します")
                .setColor("#dc143c")

            await this.textChannel?.send({ embeds: [embed] }).catch(console.error);

            if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = setTimeout(async () => {
                const queue = QueueManager.getInstance().get(this.player.guildId);
                if (!queue) return;

                console.log("[Queue] Disconnect timeout reached. Leaving channel.");
                const lavalink = LavalinkManager.getInstance();
                await lavalink.leaveVoiceChannel(this.player.guildId);
                QueueManager.getInstance().destroy(this.player.guildId);
            }, 120000);

            return;
        }

        this.current = this.queue.shift()!;
        console.log("[Queue] Playing next track", this.current.info.title);
        await this.player.playTrack({ track: { encoded: this.current.encoded } });
    }

    public push(track: Track) {
        this.queue.push(track);
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }
    }
}

class QueueManager {
    private static instance: QueueManager;
    public queues: Map<string, Queue> = new Map();

    private constructor() { }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }

    public get(guildId: string): Queue | undefined {
        return this.queues.get(guildId);
    }

    public create(guildId: string, player: Player, textChannel?: GuildTextBasedChannel): Queue {
        const queue = new Queue(player, textChannel);
        this.queues.set(guildId, queue);
        return queue;
    }

    public destroy(guildId: string) {
        const queue = this.queues.get(guildId);
        if (queue && queue.disconnectTimeout) {
            clearTimeout(queue.disconnectTimeout);
        }
        this.queues.delete(guildId);
    }
}

export default QueueManager.getInstance();
