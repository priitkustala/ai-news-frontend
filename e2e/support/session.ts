// The owner signed in to the client, the way the owner signs in. The development
// sign-in of the local test environment (Locked, Local test environment) drives the
// client's own sign-in for a seeded persona and saves the browser's resulting state as
// a Playwright storage-state file; its method is OD-21's (OPEN), so the command is read
// from E2E_APP_SIGNIN_COMMAND, which #40 writes into e2e/README.md. The template takes
// {persona} and {file}.
import { test as base, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { requireEnv } from './env';

function appSignIn(persona: string, file: string): void {
  const template = requireEnv('E2E_APP_SIGNIN_COMMAND', 'the development sign-in of the client');
  const line = template.replace('{persona}', persona).replace('{file}', `"${file}"`);
  const result = spawnSync(line, { shell: true, encoding: 'utf8', timeout: 5 * 60 * 1000 });
  if (result.error || result.status !== 0) {
    throw new Error(`The development sign-in for ${persona} failed (exit ${result.status}): ${result.stderr ?? ''}`);
  }
}

// Scenarios that need the owner's session import { test, expect } from here.
export const test = base.extend<Record<string, never>, { ownerState: string }>({
  ownerState: [
    async ({}, use, workerInfo) => {
      const file = workerInfo.project.outputDir + `/owner-state-${workerInfo.workerIndex}.json`;
      appSignIn('owner', file);
      await use(file);
    },
    { scope: 'worker' },
  ],
  storageState: async ({ ownerState }, use) => {
    await use(ownerState);
  },
});

export { expect };
