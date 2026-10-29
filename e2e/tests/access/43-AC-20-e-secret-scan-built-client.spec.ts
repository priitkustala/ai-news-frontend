// AC-20e (script, @surface-app, project iphone): story 43, coverage.md row AC-20 e.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-20; the Given/When/Then is the owning story's row AC-20e.
// Given the ai-news-frontend repository and the built client, when the repository scan runs over both, then
// it finds no string matching the seeded database password, secret key or Reddit secret, and the built client
// carries only the publishable key.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { builtClientDir, repositoryRoot } from '../../support/env';
import { scanSecrets } from '../../support/job';

test(
  'AC-20e: the repository scan finds no seeded secret in the frontend repository or the built client, which carries only the publishable key',
  { tag: ['@journey-access', '@surface-app', '@story-43'] },
  async ({}) => {
    // Given: the ai-news-frontend repository and the built client
    const repository = repositoryRoot();
    const client = builtClientDir();

    // When: the repository scan runs over both
    const scan = scanSecrets([repository, client]);

    // Then: it scanned both, finds no seeded secret, and the built client carries only the publishable key
    expect(scan.exitCode, scan.stderr).toBe(0);
    for (const target of [repository, client]) {
      const entry = (scan.report?.scanned ?? []).find((s) => path.resolve(s.path) === path.resolve(target));
      expect(entry?.files ?? 0, `scanned ${target}`).toBeGreaterThan(0);
    }
    expect(scan.report?.secret_matches).toBe(0);
    expect(scan.report?.client_keys).toEqual(['publishable']);
  },
);
