// Supabase client setup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Soft warning to dev console; UI will surface errors if used
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars are missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;