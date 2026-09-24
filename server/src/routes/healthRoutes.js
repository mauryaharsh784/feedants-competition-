const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: dbState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
