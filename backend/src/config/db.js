import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plantsight';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    console.warn(`[MongoDB] Please make sure MongoDB is running or check your MONGODB_URI in backend/.env`);
    return null;
  }
}
