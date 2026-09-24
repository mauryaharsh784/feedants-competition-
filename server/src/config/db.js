const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI from environment variables.
 * Fails fast with a clear error if the connection cannot be established,
 * since the database is the source of truth for this application.
 */
async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      // Modern mongoose (6+/7+/8+) doesn't need most legacy options,
      // but we set sane connection pool defaults for a "thousands of users" scenario.
      maxPoolSize: 50,
    });
    console.log(`[db] MongoDB connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    throw err;
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err.message);
  });
}

module.exports = { connectDB };
