import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { seedDatabase } from './src/scripts/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ name, address: net.address });
      }
    }
  }
  return addresses;
}

// Connect to DB and Start Server
async function startServer() {
  const conn = await connectDB();
  if (conn) {
    console.log('[Database] MongoDB connection established.');
  } else {
    console.warn('[Database] Initial MongoDB connection not ready. Reconnect retry active in background.');
  }

  const server = app.listen(PORT, HOST, () => {
    const localIPs = getLocalIPv4Addresses();
    console.log(`\n=================================================`);
    console.log(`  PlantSight Server running on port ${PORT}`);
    console.log(`  Local Access   : http://localhost:${PORT}`);
    localIPs.forEach((ip) => {
      console.log(`  ESP32 Endpoint (${ip.name}): http://${ip.address}:${PORT}/api/sensors/reading`);
    });
    console.log(`  Health Check   : http://localhost:${PORT}/api/health`);
    console.log(`  Environment    : ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================================\n`);
  });

  return server;
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

export default app;
