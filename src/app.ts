// The client shell of priitkustala/ai-news#40: the installable page with a sign-in screen
// that signs the seeded synthetic personas in against the local Supabase interface (the
// hosted sign-in is OD-21, DECIDED 2026-11-01; its detail is not part of this repository).
// It shows no feed yet: the feed, categories, article view, bookmarks and the rest arrive
// with their own stories, so it carries none of their data-testid names.
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config/index.js';
import { registerServiceWorker } from './sw-register.js';

registerServiceWorker();

const client: SupabaseClient = window.supabase.createClient(config.supabaseUrl, config.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const root = document.getElementById('app') as HTMLElement;

type Attributes = Record<string, string>;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

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

function signedInScreen(session: Session): HTMLElement {
  const signOut = el('button', { type: 'button', class: 'btn-outline', 'data-testid': 'sign-out' }, 'Sign out');
  signOut.addEventListener('click', () => {
    void client.auth.signOut();
  });
  return el(
    'main',
    { class: 'flex flex-1 flex-col px-4', 'data-testid': 'signed-in' },
    el('p', { class: 'text-[13px] text-muted-foreground' }, `Signed in as ${session.user.email ?? 'the owner'}`),
    el(
      'section',
      { class: 'card mt-6' },
      el('header', {}, el('h2', {}, 'No news to show yet'), el('p', {}, 'The feed screen is added by a later story.')),
      el('footer', {}, signOut),
    ),
  );
}

function render(session: Session | null): void {
  root.replaceChildren(appBar(), session ? signedInScreen(session) : signInScreen());
}

root.replaceChildren(appBar());
// The first event (INITIAL_SESSION) carries the stored session, if any.
client.auth.onAuthStateChange((_event, session) => {
  // Rendering inside the callback must not await other auth calls (supabase-js guidance).
  setTimeout(() => render(session), 0);
});
