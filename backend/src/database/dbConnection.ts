import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbConnection = (): void => {
  const dbUrl = process.env.DB_URL;

  if (!dbUrl) {
    console.error("❌ DB_URL is not defined in environment variables");
    process.exit(1);
  }

  mongoose
    .connect(dbUrl, { dbName: "Job_Portal" })
    .then(() => {
      console.log("✅ MongoDB Connected Successfully!");
    })
    .catch((error) => {
      console.error("❌ MongoDB connection error:", error.message);
      process.exit(1);
    });
};

export default dbConnection;