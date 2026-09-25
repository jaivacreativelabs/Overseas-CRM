const { createApp } = require('../dist/app');
const { connectDatabase } = require('../dist/config/database');
const { seedDatabase } = require('../dist/database/seeders/seed');

const app = createApp();
let isInitialized = false;

const ensureConnected = async () => {
  if (!isInitialized) {
    await connectDatabase();
    await seedDatabase();
    isInitialized = true;
  }
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(204).end();
  }

  try {
    await ensureConnected();
  } catch (error) {
    console.error('Database connection failed in serverless function:', error.message);
  }
  return app(req, res);
};

