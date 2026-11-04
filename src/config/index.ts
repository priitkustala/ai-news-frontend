// The client configuration (priitkustala/ai-news#43, S-05 plan step 4): the only place the
// client reads its build-time binding. scripts/build.mjs writes config.js with the local
// interface address and the local publishable key from .env.local; this module takes those
// two values and nothing else, and refuses a key that is not a publishable key, so a secret
// key never reaches the Supabase client even if a build were to write one.
export interface ClientConfig {
  readonly supabaseUrl: string;
  readonly publishableKey: string;
}

function fail(message: string): never {
  throw new Error(`config: ${message}`);
}

function read(): ClientConfig {
  const binding = window.AI_NEWS_CONFIG;
  if (!binding) fail('config.js did not set AI_NEWS_CONFIG (run npm run build).');
  const { supabaseUrl, publishableKey } = binding;
  if (typeof supabaseUrl !== 'string' || !URL.canParse(supabaseUrl)) fail('supabaseUrl is not an address.');
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_')) {
    fail('publishableKey is not a publishable key; nothing else may enter the client.');
  }
  return Object.freeze({ supabaseUrl, publishableKey });
}

export const config: ClientConfig = read();
