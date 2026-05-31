import { createClient } from '@supabase/supabase-js';
import { env, validateEnv } from './env.js';

async function testConnection() {
  try {
    validateEnv();
    
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    
    // Simple query to test connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log('✅ Supabase connection successful!');
    console.log('📊 Tables are ready to use.');
  } catch (err: any) {
    console.error('❌ Connection failed:', err?.message ?? err);
    process.exit(1);
  }
}

testConnection();