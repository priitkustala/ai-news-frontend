// The client shell of priitkustala/ai-news#40: the installable page with a sign-in screen
// that signs the seeded synthetic personas in against the local Supabase interface (the
// hosted sign-in is OD-21, DECIDED 2026-11-01; its detail is not part of this repository).
// A signed-in session shows the feed screen (priitkustala/ai-news#45, src/feed), whose titles
// open the article view (priitkustala/ai-news-frontend#1, src/article) and whose category
// filter narrows it (priitkustala/ai-news-frontend#2, src/feed/categories.ts). Bookmarks arrived
// with priitkustala/ai-news#51 (src/bookmarks, the Feed and Bookmarks tabs of src/nav.ts and the
// status message of src/status.ts); in the Home Screen web app the feed carries the daily
// notification's subscribe card (priitkustala/ai-news#50, src/push); the rest arrive with their
// own stories. Without a session a visitor reads the feed and the article view, with no owner
// control (priitkustala/ai-news-frontend#44, S-21b), and with no tab bar: bookmarks are hidden from
// visitors until accounts can be created, and the sign-in card opens only at the address /#sign-in,
// which no screen links to (priitkustala/ai-news-frontend#69, HB-1).
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { articleScreen } from './article/index.js';
import { refreshBookmarks } from './bookmarks/control.js';
import { bookmarksPanel } from './bookmarks/index.js';
import { config } from './config/index.js';
import { el } from './dom.js';
import { feedScreen, type FeedRow } from './feed/index.js';
import { installHint } from './install/index.js';
import { markTab, tabBar, type Tab } from './nav.js';
import { clearOffline } from './offline/index.js';
import { pushControl } from './push/index.js';
import { statusRegion } from './status.js';
import { registerServiceWorker } from './sw-register.js';

registerServiceWorker();

const client: SupabaseClient = window.supabase.createClient(config.supabaseUrl, config.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const root = document.getElementById('app') as HTMLElement;
// The tab bar and the status message stand outside #app, so that they survive every render and
// stay over the article view (artboard 11). The bar stands in the document only on a signed-in
// screen, directly before the status message; a visitor's screen has none, and before the first
// render it is not in the document (priitkustala/ai-news-frontend#69). The page's bottom padding
// keeps the last item and sign-out above the bar.
const bar = tabBar(selectTab);
const status = statusRegion();
document.body.append(status);
root.classList.add('pb-[75px]');

function appBar(): HTMLElement {
  return el('header', { class: 'px-4 pt-3.5 pb-2' }, el('h1', { class: 'text-[22px] font-bold leading-tight' }, 'AI news'));
}

// The sign-in card, opened at the address /#sign-in of a visitor's screen (priitkustala/ai-news-frontend#69).
function signInCard(): HTMLElement {
  const email = el('input', {
    id: 'sign-in-email',
    type: 'email',
    name: 'email',
    autocomplete: 'username',
    required: '',
    'data-testid': 'sign-in-email',
  });
  const password = el('input', {
    id: 'sign-in-password',
    type: 'password',
    name: 'password',
    autocomplete: 'current-password',
    required: '',
    'data-testid': 'sign-in-password',
  });
  const submit = el('button', { type: 'submit', class: 'btn w-full', 'data-testid': 'sign-in-submit' }, 'Sign in');
  const error = el('p', { role: 'alert', class: 'text-sm text-destructive', 'data-testid': 'sign-in-error', hidden: '' });

  const form = el(
    'form',
    { class: 'form flex flex-col gap-4', 'data-testid': 'sign-in-form', novalidate: '' },
    el('div', { class: 'field' }, el('label', { for: 'sign-in-email' }, 'Email'), email),
    el('div', { class: 'field' }, el('label', { for: 'sign-in-password' }, 'Password'), password),
    error,
    submit,
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    const { error: failure } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    submit.disabled = false;
    if (failure) {
      // 401 is the data service refusing the app's key; any other failure keeps the old message.
      error.textContent =
        failure.status === 401
          ? 'The app cannot reach its data service with its current key. Reload the page; if this stays, tell the owner.'
          : 'Sign-in failed. Check the email and the password.';
      error.hidden = false;
      password.focus();
    }
  });

  return el(
    'div',
    { class: 'flex flex-1 flex-col px-4' },
    el(
      'section',
      { class: 'card mt-6' },
      el('header', {}, el('h2', {}, 'Sign in'), el('p', { 'data-testid': 'sign-in-reason' }, 'Sign in to keep your bookmarks.')),
      el('section', {}, form),
    ),
  );
}

// The article view stands in for the whole page while it is open, as on artboard 11; the page
// behind it stays in place, hidden, so going back shows the feed as it was. Opening adds one
// history entry, so the back control and the browser's own back both return to the feed.
let closeArticle: (() => void) | null = null;

function openArticle(row: FeedRow, categoryName: string): void {
  closeArticle?.();
  const behind = (Array.from(root.children) as HTMLElement[]).filter((node) => !node.hidden);
  const scroll = window.scrollY;
  const view = articleScreen(row, categoryName, () => history.back());
  for (const node of behind) node.hidden = true;
  root.append(view);
  window.scrollTo(0, 0);
  history.pushState({ article: row.id }, '', '#article');
  closeArticle = () => {
    closeArticle = null;
    view.remove();
    for (const node of behind) node.hidden = false;
    window.scrollTo(0, scroll);
  };
}

// The feed's place is restored here, not by the browser's own restoration of the entry.
history.scrollRestoration = 'manual';
window.addEventListener('popstate', () => closeArticle?.());

// The two panels of the signed-in screen: the feed and, behind the Bookmarks tab, the owner's
// Bookmarks panel (reload draws the panel's content at every opening, leave clears it on the way
// back to the feed); null on a visitor's screen, which has no tabs (priitkustala/ai-news-frontend#69);
// then the tab shown and the feed's place while Bookmarks is shown.
let panels: { feed: HTMLElement; bookmarks: HTMLElement; reload: () => void; leave: () => void } | null = null;
let shownTab: Tab = 'feed';
let feedScroll = 0;

function showTab(tab: Tab): void {
  if (!panels) return;
  const title = root.querySelector('header h1');
  if (tab === 'bookmarks') {
    if (shownTab === 'feed') feedScroll = window.scrollY;
    panels.feed.hidden = true;
    panels.bookmarks.hidden = false;
    if (title) title.textContent = 'Bookmarks';
    window.scrollTo(0, 0);
    panels.reload();
  } else {
    panels.feed.hidden = false;
    panels.bookmarks.hidden = true;
    panels.leave();
    if (title) title.textContent = 'AI news';
    if (shownTab === 'bookmarks') window.scrollTo(0, feedScroll);
  }
  shownTab = tab;
}

// A tab tapped in the article view closes it first (popstate, as the back control does).
function selectTab(tab: Tab): void {
  if (closeArticle) {
    window.addEventListener('popstate', () => showTab(tab), { once: true });
    history.back();
    return;
  }
  showTab(tab);
}

// The signed-in screen is the feed (the development sign-in waits for data-testid signed-in),
// with the Bookmarks panel, hidden, behind the Bookmarks tab.
function signedInScreen(): HTMLElement {
  const signOut = el('button', { type: 'button', class: 'btn', 'data-variant': 'outline', 'data-size': 'sm', 'data-testid': 'sign-out' }, 'Sign out');
  signOut.addEventListener('click', () => {
    void client.auth.signOut();
  });
  const feed = feedScreen(client, openArticle, pushControl(client));
  const bookmarks = bookmarksPanel(client, openArticle);
  bookmarks.panel.hidden = true;
  panels = { feed, bookmarks: bookmarks.panel, reload: () => void bookmarks.reload(), leave: () => undefined };
  return el(
    'main',
    { class: 'flex flex-1 flex-col', 'data-testid': 'signed-in' },
    feed,
    bookmarks.panel,
    el('footer', { class: 'flex justify-center px-4 py-6' }, signOut),
  );
}

// A visitor's screen: the feed with no bookmark control, no push card and no tab bar, and the
// sign-in card drawn in the feed's place exactly while the address is /#sign-in, so the feed screen
// holds no sign-in form (priitkustala/ai-news-frontend#69). No bookmark or push read is made without
// a session.
let guest: { feed: HTMLElement; signIn: HTMLElement } | null = null;

// Shows the card or the feed as the address says; nothing changes when the card already stands as
// the address asks (the back from the article view changes the address too).
function showSignIn(): void {
  if (!guest) return;
  const wanted = location.hash === '#sign-in';
  if (wanted === (guest.signIn.childElementCount > 0)) return;
  if (wanted) guest.signIn.replaceChildren(signInCard());
  else guest.signIn.replaceChildren();
  guest.signIn.hidden = !wanted;
  guest.feed.hidden = wanted;
}

function guestScreen(): HTMLElement {
  const feed = feedScreen(client, openArticle, null, true);
  const signIn = el('div', { class: 'flex flex-1 flex-col', hidden: '' });
  guest = { feed, signIn };
  showSignIn();
  return el('main', { class: 'flex flex-1 flex-col' }, feed, signIn);
}

// The address /#sign-in, entered on an open visitor's screen, opens the card; leaving it closes it.
// On any other screen the address changes nothing.
window.addEventListener('hashchange', () => {
  if (renderedUser === null) showSignIn();
});

// The app bar, then the install hint in a Safari tab only (absent in the Home Screen web app).
function top(): HTMLElement[] {
  const hint = installHint();
  return hint ? [appBar(), hint] : [appBar()];
}

// The user whose screen is shown: undefined before the first event, null on a visitor's screen.
let renderedUser: string | null | undefined;

// Every render starts on the Feed tab. A session leaves the address /#sign-in, and only a signed-in
// screen has the tab bar (priitkustala/ai-news-frontend#69).
function render(session: Session | null): void {
  if (session && location.hash === '#sign-in') history.replaceState(null, '', location.pathname + location.search);
  closeArticle = null;
  renderedUser = session?.user.id ?? null;
  panels = null;
  guest = null;
  shownTab = 'feed';
  markTab(bar, 'feed');
  if (session) status.before(bar);
  else bar.remove();
  if (!session) clearOffline();
  // The bookmarks read goes out before the feed's, so the controls are drawn from it.
  if (session) void refreshBookmarks(client);
  root.replaceChildren(...top(), session ? signedInScreen() : guestScreen());
}

// The first event and SIGNED_OUT always render. With a stored session the first event is the
// library's SIGNED_IN, and INITIAL_SESSION follows it. Any other event for the user already shown (the
// SIGNED_IN of a return to the tab, TOKEN_REFRESHED, USER_UPDATED) keeps the screen as it is: an
// open article view, the feed behind it and its place. A change of user, or between no session
// and a session, renders.
function needsRender(event: AuthChangeEvent, session: Session | null): boolean {
  if (event === 'SIGNED_OUT' || renderedUser === undefined) return true;
  return (session?.user.id ?? null) !== renderedUser;
}

async function sessionRefused(session: Session): Promise<boolean> {
  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${session.access_token}` },
    });
    if (response.ok) return false;
    const body = (await response.json()) as { error_code?: string };
    return body.error_code === 'bad_jwt';
  } catch {
    return false;
  }
}

// A reload while the article view was open starts on the feed, without its history mark.
if (location.hash === '#article') history.replaceState(null, '', location.pathname + location.search);
root.replaceChildren(...top());
// The first event carries the stored session, if any.
// Counts the auth events delivered. A check of a stored session that was started before a newer event is stale
// when its answer arrives: the newer event has already rendered, so the stale answer does nothing.
let authGeneration = 0;
client.auth.onAuthStateChange((event, session) => {
  const generation = ++authGeneration;
  // Rendering inside the callback must not await other auth calls (supabase-js guidance).
  setTimeout(async () => {
    // A stored session is only a claim until the data service has seen it: after a restart the
    // stack no longer knows the session the browser kept, so a refused one goes to a visitor's screen.
    // Only a token the stack cannot verify (bad_jwt) counts; any other answer, offline included, keeps the
    // stored session, as the offline reading needs.
    if (renderedUser === undefined && session) {
      const refused = await sessionRefused(session);
      if (generation !== authGeneration) return;
      if (refused) {
        await client.auth.signOut({ scope: 'local' });
        return;
      }
    }
    if (needsRender(event, session)) render(session);
  }, 0);
});
