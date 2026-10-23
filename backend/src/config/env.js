import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  EXPORT_DIR: process.env.EXPORT_DIR || (process.env.VERCEL ? '/tmp/exports_storage' : './exports_storage'),
  SAMPLE_DATA_DIR: process.env.SAMPLE_DATA_DIR || (process.env.VERCEL ? path.resolve(process.cwd(), 'sample-data') : '../sample-data')
};
