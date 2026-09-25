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
  try {
    await ensureConnected();
  } catch (error) {
    console.error('Database connection failed in serverless function:', error);
  }
  return app(req, res);
}

