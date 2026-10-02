import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb://jaivacreativelabs_db_user:MrgQV5YaO4XXrhgc@ac-mcv1ujz-shard-00-00.ryywp2q.mongodb.net:27017,ac-mcv1ujz-shard-00-01.ryywp2q.mongodb.net:27017,ac-mcv1ujz-shard-00-02.ryywp2q.mongodb.net:27017/jaiva_crm?ssl=true&replicaSet=atlas-104x5a-shard-0&authSource=admin&retryWrites=true&w=majority',
  JWT_SECRET: process.env.JWT_SECRET || 'overseas_crm_super_secret_jwt_key_2026_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
