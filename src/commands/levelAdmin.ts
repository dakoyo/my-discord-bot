import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    GuildTextBasedChannel,
    VoiceBasedChannel,
    EmbedBuilder
} from "discord.js";
import { LevelManager } from "../features/levelManager";
import GuildConfig from "../models/guildConfig";

export const command = new SlashCommandBuilder()
    .setName("level-admin")
    .setDescription("レベルシステム用の管理者コマンド")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand.setName("set")
            .setDescription("ユーザーのレベルを設定します")
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("対象ユーザー")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("type")
                    .setDescription("レベルの種類")
                    .setRequired(true)
                    .addChoices(
                        { name: "テキスト", value: "text" },
                        { name: "ボイス", value: "voice" }
                    )
            )
            .addIntegerOption(option =>
                option
                    .setName("level")
                    .setDescription("設定するレベル")
                    .setRequired(true)
                    .setMinValue(0)
            )
    )
    .addSubcommand(subcommand =>
        subcommand.setName("reset")
            .setDescription("ユーザーのレベルデータをリセットします")
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("対象ユーザー")
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand.setName("ignore")
            .setDescription("無視するチャンネルを管理します")
            .addStringOption(option =>
                option
                    .setName("action")
                    .setDescription("追加または削除")
                    .setRequired(true)
                    .addChoices(
                        { name: "追加", value: "add" },
                        { name: "削除", value: "remove" }
                    )
            )
            .addChannelOption(option =>
                option
                    .setName("channel")
                    .setDescription("対象チャンネル")
                    .setRequired(true)
                    .addChannelTypes(
                        ChannelType.GuildText,
                        ChannelType.PublicThread,
                        ChannelType.GuildVoice
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName("list-ignored")
            .setDescription("無視されているチャンネル一覧を表示します")
    );

export const callback = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === "set") {
        const user = interaction.options.getUser("user", true);
        const type = interaction.options.getString("type", true) as "text" | "voice";
        const level = interaction.options.getInteger("level", true);

        await LevelManager.setLevel(user.id, guildId, type, level);
        await interaction.reply({
            content: `${user} の **${type === "text" ? "テキスト" : "ボイス"}レベル** を **${level}** に設定しました。`
        });

    } else if (subcommand === "reset") {
        const user = interaction.options.getUser("user", true);
        await LevelManager.resetLevel(user.id, guildId);
        await interaction.reply({
            content: `${user} のすべてのレベルデータをリセットしました。`
        });

    } else if (subcommand === "ignore") {
        const action = interaction.options.getString("action", true);
        const channel = interaction.options.getChannel(
            "channel",
            true
        ) as GuildTextBasedChannel | VoiceBasedChannel;

        let config = await GuildConfig.findOne({ guildId });
        if (!config) {
            config = new GuildConfig({ guildId });
        }

        const isVoice =
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildStageVoice;

        let list = isVoice
            ? config.ignoredVoiceChannelIds
            : config.ignoredTextChannelIds;

        if (action === "add") {
            if (!list.includes(channel.id)) {
                list.push(channel.id);
            }
        } else {
            const index = list.indexOf(channel.id);
            if (index > -1) {
                list.splice(index, 1);
            }
        }

        if (isVoice) {
            config.ignoredVoiceChannelIds = list;
        } else {
            config.ignoredTextChannelIds = list;
        }

        await config.save();

        await interaction.reply({
            content: `${channel} を無視リスト${action === "add" ? "に追加" : "から削除"}しました。`
        });

    } else if (subcommand === "list-ignored") {
        const config = await GuildConfig.findOne({ guildId });

        if (!config) {
            await interaction.reply({
                content: "現在、無視されているチャンネルはありません。"
            });
            return;
        }

        const textChannels =
            config.ignoredTextChannelIds.map(id => `<#${id}>`).join(", ") || "なし";
        const voiceChannels =
            config.ignoredVoiceChannelIds.map(id => `<#${id}>`).join(", ") || "なし";

        const embed = new EmbedBuilder()
            .setTitle("無視されているチャンネル")
            .setColor("#FF0000")
            .addFields(
                { name: "テキストチャンネル", value: textChannels },
                { name: "ボイスチャンネル", value: voiceChannels }
            );

        await interaction.reply({ embeds: [embed] });
    }
};
