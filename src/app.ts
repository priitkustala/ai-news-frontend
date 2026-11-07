// The client shell of priitkustala/ai-news#40: the installable page with a sign-in screen
// that signs the seeded synthetic personas in against the local Supabase interface (the
// hosted sign-in is OD-21, DECIDED 2026-11-01; its detail is not part of this repository).
// A signed-in session shows the feed screen (priitkustala/ai-news#45, src/feed), whose titles
// open the article view (priitkustala/ai-news-frontend#1, src/article) and whose category
// filter narrows it (priitkustala/ai-news-frontend#2, src/feed/categories.ts); in the Home Screen
// web app it carries the daily notification's subscribe card (priitkustala/ai-news#50, src/push);
// bookmarks and the rest arrive with their own stories.
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { articleScreen } from './article/index.js';
import { config } from './config/index.js';
import { el } from './dom.js';
import { feedScreen, type FeedRow } from './feed/index.js';
import { installHint } from './install/index.js';
import { pushControl } from './push/index.js';
import { registerServiceWorker } from './sw-register.js';

registerServiceWorker();

const client: SupabaseClient = window.supabase.createClient(config.supabaseUrl, config.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const root = document.getElementById('app') as HTMLElement;

function appBar(): HTMLElement {
  return el('header', { class: 'px-4 pt-3.5 pb-2' }, el('h1', { class: 'text-[22px] font-bold leading-tight' }, 'AI news'));
}

function signInScreen(): HTMLElement {
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
      error.textContent = 'Sign-in failed. Check the email and the password.';
      error.hidden = false;
      password.focus();
    }
  });

  return el(
    'main',
    { class: 'flex flex-1 flex-col px-4' },
    el(
      'section',
      { class: 'card mt-6' },
      el('header', {}, el('h2', {}, 'Sign in'), el('p', {}, 'Sign in to read your AI news.')),
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

// The signed-in screen is the feed (the development sign-in waits for data-testid signed-in).
function signedInScreen(): HTMLElement {
  const signOut = el('button', { type: 'button', class: 'btn', 'data-variant': 'outline', 'data-size': 'sm', 'data-testid': 'sign-out' }, 'Sign out');
  signOut.addEventListener('click', () => {
    void client.auth.signOut();
  });
  return el(
    'main',
    { class: 'flex flex-1 flex-col', 'data-testid': 'signed-in' },
    feedScreen(client, openArticle, pushControl(client)),
    el('footer', { class: 'flex justify-center px-4 py-6' }, signOut),
  );
}

// The app bar, then the install hint in a Safari tab only (absent in the Home Screen web app).
function top(): HTMLElement[] {
  const hint = installHint();
  return hint ? [appBar(), hint] : [appBar()];
}

// The user whose screen is shown: undefined before the first event, null on the sign-in screen.
let renderedUser: string | null | undefined;

function render(session: Session | null): void {
  closeArticle = null;
  renderedUser = session?.user.id ?? null;
  root.replaceChildren(...top(), session ? signedInScreen() : signInScreen());
}

// INITIAL_SESSION and SIGNED_OUT always render. Any other event for the user already shown (the
// SIGNED_IN of a return to the tab, TOKEN_REFRESHED, USER_UPDATED) keeps the screen as it is: an
// open article view, the feed behind it and its place. A change of user, or between no session
// and a session, renders.
function needsRender(event: AuthChangeEvent, session: Session | null): boolean {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT' || renderedUser === undefined) return true;
  return (session?.user.id ?? null) !== renderedUser;
}

// A reload while the article view was open starts on the feed, without its history mark.
if (location.hash === '#article') history.replaceState(null, '', location.pathname + location.search);
root.replaceChildren(...top());
// The first event (INITIAL_SESSION) carries the stored session, if any.
client.auth.onAuthStateChange((event, session) => {
  // Rendering inside the callback must not await other auth calls (supabase-js guidance).
  setTimeout(() => {
    if (needsRender(event, session)) render(session);
  }, 0);
});
