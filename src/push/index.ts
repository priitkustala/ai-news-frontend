// The daily notification's subscribe card of priitkustala/ai-news#50 (S-15; B-14, AC-14), drawn
// after the approved artboards 18 to 20 (design/ai-news-app/v1). It belongs to the Home Screen
// web app only: in a Safari tab the page shows nothing of it (artboard 15). Where the platform
// offers no notifications the unavailable note shows (artboard 20), after a refusal the
// re-enable note (artboard 19), otherwise the card with the subscribe control (artboard 18).
// Permission is asked only when the owner taps the control, never on load. A subscription is
// stored as one push_subscriptions row (endpoint and keys) under the owner's session. Every
// text is set as a text node, never as markup (B-03).
import type { SupabaseClient } from '@supabase/supabase-js';
import { pushPublicKey } from '../config/push.js';
import { el, icon } from '../dom.js';
import { isHomeScreenWebApp } from '../install/index.js';

const BELL = 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0';

// The notification notes (design README: #1A1C21 on #F4F5F7), with role status.
function note(testid: string, headline: string, text: string): HTMLElement {
  return el(
    'div',
    { class: 'mx-4 mt-3 mb-1 rounded-xl bg-[#f4f5f7] px-3.5 py-3 text-sm text-[#1a1c21]', role: 'status', 'data-testid': testid },
    el('p', { class: 'font-bold' }, headline),
    el('p', {}, text),
  );
}

function refusedNote(): HTMLElement {
  return note(
    'notifications-refused',
    'Notifications are off.',
    "The daily feed works as usual. To get the daily notification, allow notifications for AI news in the iPhone's Settings.",
  );
}

// The applicationServerKey: the base64url public key as its bytes.
function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const binary = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Subscribes and stores the subscription; a row already stored for the endpoint (23505) counts
// as done. Resolves true when subscribed, false when the owner refused the permission.
async function subscribe(client: SupabaseClient): Promise<boolean> {
  // First, before any other await: the platform allows the request only in direct response to
  // the owner's tap.
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return false;
  if (permission !== 'granted') throw new Error(`notification permission ${permission}`);
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(pushPublicKey) });
  const { endpoint, keys } = subscription.toJSON();
  const { error } = await client.from('push_subscriptions').insert({ endpoint, keys });
  if (error && error.code !== '23505') throw new Error(error.message);
  return true;
}

function pushCard(client: SupabaseClient): HTMLElement {
  const control = el(
    'button',
    {
      type: 'button',
      class: 'inline-flex min-h-9 min-w-24 shrink-0 items-center justify-center rounded-[18px] bg-[#1f4fd1] px-3.5 text-sm font-semibold text-white',
      'data-testid': 'subscribe',
    },
    'Subscribe',
  );
  const failure = el('p', { role: 'alert', hidden: '' }, 'Subscribing failed. Try again.');
  const bell = icon(24, BELL);
  bell.classList.add('shrink-0');
  const card = el(
    'div',
    { class: 'mx-4 mt-3 mb-1 flex items-center gap-2.5 rounded-xl bg-[#eef2fb] px-3.5 py-3 text-sm text-[#1a1c21]', 'data-testid': 'push-card' },
    bell,
    el('div', { class: 'flex-1' }, el('p', {}, 'Get one notification when the daily feed is ready.'), failure),
    control,
  );
  control.addEventListener('click', () => {
    failure.hidden = true;
    control.disabled = true;
    subscribe(client).then(
      (subscribed) => (subscribed ? card.remove() : card.replaceWith(refusedNote())),
      (error: unknown) => {
        console.error('push: subscribing failed', error);
        control.disabled = false;
        failure.hidden = false;
      },
    );
  });
  // Already subscribed on this device: the card goes. Never waits on serviceWorker.ready, which
  // can hang, before the card shows.
  navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.pushManager.getSubscription())
    .then(
      (existing) => {
        if (existing) card.remove();
      },
      () => {},
    );
  return card;
}

// The element the feed screen places under last-updated, or null outside the Home Screen web app.
export function pushControl(client: SupabaseClient): HTMLElement | null {
  if (!isHomeScreenWebApp()) return null;
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
    return note('notifications-unavailable', 'Notifications are not available here.', 'The daily feed works as usual.');
  }
  if (Notification.permission === 'denied') return refusedNote();
  return pushCard(client);
}
