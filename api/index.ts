import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../backend/src/app';
import { connectDatabase } from '../backend/src/config/database';
import { seedDatabase } from '../backend/src/database/seeders/seed';

let appInstance: any = null;
let isInitialized = false;

const initializeApp = async () => {
  if (!appInstance) {
    appInstance = createApp();
  }
  if (!isInitialized) {
    try {
      await connectDatabase();
      await seedDatabase();
    } catch (error) {
      console.error('Database connection / seed check error in serverless handler:', error);
    }
    isInitialized = true;
  }
  return appInstance;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await initializeApp();
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel API Handler Exception:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: err?.message || 'Server error',
    });
  }
}
