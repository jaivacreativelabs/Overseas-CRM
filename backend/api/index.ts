import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';
import { seedDatabase } from '../src/database/seeders/seed';

const app = createApp();

let isInitialized = false;

const ensureConnected = async () => {
  if (!isInitialized) {
    await connectDatabase();
    await seedDatabase();
    isInitialized = true;
  }
};

export default async function handler(req: any, res: any) {
  // Respond to CORS preflight immediately without waiting for database
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(204).end();
  }

  try {
    await ensureConnected();
  } catch (error) {
    console.error('Database connection failed in serverless function:', error);
  }
  return app(req, res);
}

