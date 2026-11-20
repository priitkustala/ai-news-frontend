// The reading of the feed screen (priitkustala/ai-news-frontend#81, CQ-D1): the first read of the
// feed, categories and ingestion_runs relations through the data interface, the copy kept on the
// device (S-19, src/offline), and the choice between online, the Offline banner and the Error state,
// returned as one result for feedScreen (./index.ts) to draw. The category filter's read is here too.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from './categories.js';
import type { CompletedRun, FeedRow } from './index.js';
import { feedCopy, lifetime, reachable, saveFeed, setMode, type FeedCopy } from '../offline/index.js';

const FEED_COLUMNS = 'id,source_id,title,summary,source_name,category,canonical_url,image_url,image_policy,published_at,source_type,community,post_url,external_url,author_handle,digest';

// The feed view's rows in the view's order: every row for category null, otherwise that
// category's rows only. Each selection of the filter reads the server again (AC-19).
export async function readFeed(client: SupabaseClient, category: string | null, retry = true): Promise<FeedRow[]> {
  const query = client.from('feed').select(FEED_COLUMNS);
  const { data, error } = await (category === null ? query : query.eq('category', category)).retry(retry);
  if (error) throw new Error(error.message);
  return data as FeedRow[];
}

// The first read makes no automatic retry (supabase-js retries a failed GET for about 7 seconds),
// so that a failed read shows the Offline banner or the Error state at once (S-19).
async function load(client: SupabaseClient): Promise<FeedCopy> {
  const [rows, categories, runs] = await Promise.all([
    readFeed(client, null, false),
    client.from('categories').select('id,name,item_count').retry(false),
    client
      .from('ingestion_runs')
      .select('run_date,ended_at')
      .eq('status', 'completed')
      .order('ended_at', { ascending: false, nullsFirst: false })
      .order('run_date', { ascending: false })
      .limit(1)
      .retry(false),
  ]);
  if (categories.error) throw new Error(categories.error.message);
  if (runs.error) throw new Error(runs.error.message);
  return { rows, categories: categories.data as Category[], run: ((runs.data as CompletedRun[])[0] ?? null) };
}

// What the screen draws: online (a fresh read), offline (nothing answered) or error (the app's own
// origin answered, the data interface failed).
export type FeedState = 'online' | 'offline' | 'error';

// The state and the copy to draw: the fresh read, or the kept copy (null when there is none).
export interface FeedResult {
  state: FeedState;
  copy: FeedCopy | null;
}

// The first read. A fresh read is kept on the device and returned online; a read answered after
// sign-out draws and keeps nothing (null). A failed read asks whether the app's own origin answers
// (S-19): no answer is offline, an answer is error, either with the kept copy. With fallback false
// (Retry) a failed read throws instead.
export async function firstRead(client: SupabaseClient, fallback = true): Promise<FeedResult | null> {
  const life = lifetime();
  let copy: FeedCopy;
  try {
    copy = await load(client);
  } catch (error) {
    if (!fallback) throw error;
    const offline = !(await reachable());
    const state = offline ? 'offline' : 'error';
    setMode(state);
    return { state, copy: feedCopy() };
  }
  if (life !== lifetime()) return null;
  setMode('online');
  saveFeed(copy);
  return { state: 'online', copy };
}
