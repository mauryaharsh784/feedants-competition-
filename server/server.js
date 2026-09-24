require('dotenv').config();

const createApp = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/feedants_competition';

async function start() {
  await connectDB(MONGO_URI);

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`[server] Feedants Competition API listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    console.log('[server] Shutting down gracefully...');
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
