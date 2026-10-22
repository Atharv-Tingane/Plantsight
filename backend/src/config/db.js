import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let isConnecting = false;
let reconnectTimer = null;

// Attach connection lifecycle event listeners
mongoose.connection.on('connected', () => {
  console.log(`[MongoDB] Connected successfully: ${mongoose.connection.host}/${mongoose.connection.name}`);
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost. Attempting to reconnect...');
  scheduleReconnect();
});

function scheduleReconnect() {
  if (reconnectTimer || isConnecting || mongoose.connection.readyState === 1) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await connectDB();
  }, 5000);
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (isConnecting) return null;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plantsight';

  isConnecting = true;
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    isConnecting = false;
    return conn;
  } catch (err) {
    isConnecting = false;
    console.error(`[MongoDB] Connection error: ${err.message}`);
    console.warn(`[MongoDB] Please check network connection and ensure your current IP is in MongoDB Atlas Network Access.`);
    scheduleReconnect();
    return null;
  }
}
