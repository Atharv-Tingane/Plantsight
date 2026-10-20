import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { seedDatabase } from './src/scripts/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 5000;

// Connect to DB and Start Server
async function startServer() {
  const conn = await connectDB();
  if (conn) {
    console.log('[Database] MongoDB connection established.');
  }

  const server = app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`  PlantSight Server running on port ${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================================\n`);
  });

  return server;
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

export default app;
