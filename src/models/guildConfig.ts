import mongoose, { Schema, Document } from "mongoose";

export interface IGuildConfig extends Document {
    guildId: string;
    ignoredTextChannelIds: string[];
    ignoredVoiceChannelIds: string[];
}

const GuildConfigSchema: Schema = new Schema({
    guildId: { type: String, required: true, unique: true },
    ignoredTextChannelIds: { type: [String], default: [] },
    ignoredVoiceChannelIds: { type: [String], default: [] }
});

export default mongoose.model<IGuildConfig>("GuildConfig", GuildConfigSchema);
