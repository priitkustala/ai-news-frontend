// What the page provides before app.js runs (public/index.html): the Supabase browser
// module as the global `supabase` (vendor/supabase.js, copied from @supabase/supabase-js by
// scripts/build.mjs) and the build-time configuration (config.js, written by the same script
// with the local interface address and the local publishable key only). Only src/config reads
// AI_NEWS_CONFIG; it checks both values, so they are typed here as unchecked.
import type { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    supabase: { createClient: typeof createClient };
    AI_NEWS_CONFIG?: { supabaseUrl?: unknown; publishableKey?: unknown };
  }
}

export {};
