import mongoose from "mongoose";

export async function connectDatabase() {
    try {
        if (!process.env.MONGO_URL) {
            console.error("MONGO_URL is not defined in .env");
            return;
        }
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}
