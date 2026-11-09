// AC-3 (scenario, @surface-app, project iphone): bug 45 (priitkustala/ai-news-frontend#45, SI-51), row AC-3.
// Source: the regression contract (ai-news-team-context rules/regression-contract.md), Test integrity 2:
// a bug is reproduced by a scenario that fails before the fix.
// Given the data service answers the sign-in request as the stack really answers a refused key (401,
// invalid API key) and, in the second part, a wrong password (400, invalid_credentials), when the owner
// submits, then the error element has the key message, containing neither email nor password, and for
// the wrong password the existing message.
import { test, expect } from '@playwright/test';
import { ownerCredentials } from '../../support/client-build';

// The held route must see the sign-in request: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

const KEY_MESSAGE = 'The app cannot reach its data service with its current key. Reload the page; if this stays, tell the owner.';
const PASSWORD_MESSAGE = 'Sign-in failed. Check the email and the password.';

test(
  'AC-3: a refused key has its own message; a wrong password keeps the old one',
  { tag: ['@journey-install', '@surface-app', '@bug-45'] },
  async ({ page }) => {
    // The answers the local stack really gave (status readings of this item)
    let answer = { status: 401, body: { message: 'Invalid API key' } } as { status: number; body: object };
    await page.route('**/auth/v1/token*', async (route) => {
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      await route.fulfill({ status: answer.status, headers: cors, contentType: 'application/json', body: JSON.stringify(answer.body) });
    });
    const { email, password } = ownerCredentials();

    try {
      // Given: the sign-in screen
      await page.goto('/');
      await page.getByTestId('sign-in-email').fill(email);
      await page.getByTestId('sign-in-password').fill(password);

      // Part one, when the owner submits and the data service refuses the key
      await page.getByTestId('sign-in-submit').click();
      // Then: its own message, which blames neither the email nor the password
      const error = page.getByTestId('sign-in-error');
      await expect(error).toHaveText(KEY_MESSAGE);
      const shown = ((await error.textContent()) ?? '').toLowerCase();
      expect(shown).not.toContain('email');
      expect(shown).not.toContain('password');

      // Part two, when the owner submits and the data service answers a wrong password
      answer = { status: 400, body: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' } };
      await page.getByTestId('sign-in-submit').click();
      // Then: the existing message
      await expect(error).toHaveText(PASSWORD_MESSAGE);
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  },
);
