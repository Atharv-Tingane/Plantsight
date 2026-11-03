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
  }, 3000);
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
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
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

/**
 * Ensures MongoDB is connected. If disconnected or in-progress, waits up to timeoutMs.
 * @param {number} timeoutMs - Maximum ms to wait (default 4000)
 * @returns {Promise<boolean>} - true if connected (readyState === 1)
 */
export async function ensureDBConnection(timeoutMs = 4000) {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  // If completely disconnected, trigger connection attempt immediately
  if (mongoose.connection.readyState === 0 && !isConnecting) {
    connectDB().catch(() => {});
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    if (mongoose.connection.readyState === 0 && !isConnecting) {
      connectDB().catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return mongoose.connection.readyState === 1;
}
