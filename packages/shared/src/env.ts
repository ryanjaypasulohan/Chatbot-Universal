// Load environment variables from .env file at project root
import dotenv from 'dotenv';
import path from 'path';

// Find the root .env file (two levels up from packages/shared)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
};

// Simple validation to catch missing variables early
const OPTIONAL_KEYS = new Set(['OPENROUTER_API_KEY', 'DATABASE_URL']);

export function validateEnv() {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (!value && !OPTIONAL_KEYS.has(key)) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  console.log('✅ Environment variables loaded');
}