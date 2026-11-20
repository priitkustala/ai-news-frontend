// The reading of the Bookmarks panel (priitkustala/ai-news-frontend#82, CQ-D2): the owner's
// bookmarks, the feed and the categories read at once through the data interface with the owner's
// session, the copy kept on the device (S-19, src/offline) and the not-loaded case, returned as one
// result for bookmarksPanel (./index.ts) to draw.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedRow } from '../feed/index.js';
import { bookmarksCopy, feedCopy, saveBookmarks, type BookmarkCopyRow } from '../offline/index.js';

// What the panel draws: a fresh read, the kept copy after a failed read, or the not-loaded note
// when a read failed and nothing is kept.
export type BookmarksState = 'fresh' | 'kept' | 'not-loaded';

// The state with the rows to draw: the bookmarks, newest first, and the feed rows and category
// names that draw a bookmark the feed lists; all empty when not loaded.
export interface BookmarksResult {
  state: BookmarksState;
  rows: BookmarkCopyRow[];
  feed: FeedRow[];
  categories: { id: string; name: string }[];
}

// The relations of the three reads, in the order of their answers.
const RELATIONS = ['bookmarks', 'feed', 'categories'];

// The fields of an answer that a failed read logs.
interface Answer {
  status: number;
  error: { code: string } | null;
}

// The three reads. current tells whether the opening that asked is still the latest one, within the
// signed-in lifetime it started in; when it is not, nothing is kept, saved or returned (null). A
// failed read is logged in one line, by the relation, HTTP status and error code of its first failed
// answer, or by the error's name when the reads throw; never by the message, which can quote the
// read text, and so bookmark titles.
export async function readBookmarks(client: SupabaseClient, current: () => boolean): Promise<BookmarksResult | null> {
  // The reads make no automatic retry, so that a failed one draws the kept copy at once (S-19).
  let answers;
  try {
    answers = await Promise.all([
      client.from('bookmarks').select('item_id,title,link,summary').order('created_at', { ascending: false }).retry(false),
      client.from('feed').select('*').retry(false),
      client.from('categories').select('id,name').retry(false),
    ]);
  } catch (error) {
    console.error('bookmarks panel read failed', 'thrown', error instanceof Error ? error.name : typeof error);
  }
  const fresh = answers && readCleanly(answers) ? answers : null;
  if (!current()) return null;
  if (!fresh) return keptResult();
  const [bookmarks, feed, categories] = fresh;
  const rows = bookmarks.data as BookmarkCopyRow[];
  saveBookmarks(rows);
  return { state: 'fresh', rows, feed: feed.data as FeedRow[], categories: categories.data as { id: string; name: string }[] };
}

// Whether every answer read; the first that carries an error, in the order of RELATIONS, is logged.
function readCleanly(answers: readonly Answer[]): boolean {
  for (const [index, answer] of answers.entries()) {
    if (answer.error) {
      console.error('bookmarks panel read failed', RELATIONS[index], answer.status, answer.error.code);
      return false;
    }
  }
  return true;
}

// After a failed read: the kept copy, each row drawn with the kept feed where that feed lists it,
// or not loaded when nothing is kept. An empty kept list is kept.
function keptResult(): BookmarksResult {
  const kept = bookmarksCopy();
  if (!kept) return { state: 'not-loaded', rows: [], feed: [], categories: [] };
  const keptFeed = feedCopy();
  return { state: 'kept', rows: kept, feed: keptFeed?.rows ?? [], categories: keptFeed?.categories ?? [] };
}
