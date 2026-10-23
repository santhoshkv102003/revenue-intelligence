import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  EXPORT_DIR: process.env.EXPORT_DIR || './exports_storage',
  SAMPLE_DATA_DIR: process.env.SAMPLE_DATA_DIR || '../sample-data'
};
