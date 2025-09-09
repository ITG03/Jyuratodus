// Supabase client setup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create a safe client or a stub that throws only when used
let supabase;
if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars are missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
  // Stub: prevent immediate crash at import time
  supabase = new Proxy({}, {
    get() {
      throw new Error('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
    }
  });
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
export default supabase;