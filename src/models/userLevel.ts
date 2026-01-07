import mongoose, { Schema, Document } from "mongoose";

export interface IUserLevel extends Document {
    userId: string;
    guildId: string;
    messageXp: number;
    messageLevel: number;
    voiceXp: number;
    voiceLevel: number;
    lastMessageDate: Date;
}

const UserLevelSchema: Schema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    messageXp: { type: Number, default: 0 },
    messageLevel: { type: Number, default: 0 },
    voiceXp: { type: Number, default: 0 },
    voiceLevel: { type: Number, default: 0 },
    lastMessageDate: { type: Date, default: null }
});

UserLevelSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model<IUserLevel>("UserLevel", UserLevelSchema);
