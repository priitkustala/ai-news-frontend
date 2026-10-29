// Finding seeded items on the screen by their data-testid, with the run marker the
// seed put into their titles. Text is read only as data, never used as a selector.
// Every wait is web-first: a locator assertion or expect.poll on the complete expected
// state (round 19 F5), never one sample of the page.
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

// The feed-item (inside scope) whose feed-item-title contains fragment; waits for it. The
// argument why names the step: a prerequisite another story provides (for example the 45
// feed), or the owning story's first unmet step (sprint-02.md section 2.4).
export async function itemWithTitle(scope: Page | Locator, fragment: string, why = 'a feed-item'): Promise<Locator> {
  const items = scope.getByTestId('feed-item');
  let index = -1;
  await expect
    .poll(
      async () => {
        const titles = await items.getByTestId('feed-item-title').allTextContents();
        index = titles.findIndex((title) => title.includes(fragment));
        return index;
      },
      { message: `${why}: a feed-item whose feed-item-title contains ${fragment}` },
    )
    .toBeGreaterThanOrEqual(0);
  return items.nth(index);
}

// Waits until the feed-item titles inside scope are exactly titles (in any order): the
// complete expected set the fixture manifest names, so that an absence read after it is
// read from a settled list.
export async function expectTitles(scope: Page | Locator, titles: string[], why: string): Promise<void> {
  await expect
    .poll(async () => (await scope.getByTestId('feed-item').getByTestId('feed-item-title').allTextContents()).map((t) => t.trim()).sort(), {
      message: `${why}: the feed-item titles are exactly the expected set`,
    })
    .toEqual([...titles].sort());
}

// The category-option whose name starts with name (the option also shows its count).
export async function categoryOption(page: Page, name: string, why = 'a category-option'): Promise<Locator> {
  const options = page.getByTestId('category-option');
  let index = -1;
  await expect
    .poll(
      async () => {
        const labels = await options.allTextContents();
        index = labels.findIndex((label) => label.trim().startsWith(name));
        return index;
      },
      { message: `${why}: a category-option named ${name}` },
    )
    .toBeGreaterThanOrEqual(0);
  return options.nth(index);
}

// The expected item records a fixture manifest names (title, source, category, summary,
// original_url, and for Reddit items community, author, post_url, external_url).
export type ExpectedItem = Record<string, string>;
export function expectedItems(manifest: Record<string, unknown>, field = 'items'): ExpectedItem[] {
  const list = manifest[field];
  return Array.isArray(list) ? (list as ExpectedItem[]) : [];
}

// Reopens the page (a reload) and turns a rejected or hanging navigation into a failed
// assertion that names the step, so an app that cannot reopen (for example offline with no
// cached document, before 4) fails on that assertion and never in an uncaught navigation
// error (round 20 R20-2). It waits for the document only (domcontentloaded), never for every
// subresource, and is bounded below the test's own timeout; what follows waits on element
// conditions.
export async function reopen(page: Page, why: string): Promise<void> {
  const failure = await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 }).then(
    () => '',
    (error: Error) => error.message.split('\n')[0],
  );
  expect(failure, `${why}: the app reopens (the navigation is answered)`).toBe('');
}

// The image semantics inside the boundary of a published testid (round 21 R21-1). The element
// the testid names is the image itself (an img, an svg or an element with role img), or a
// wrapper that holds it, as on artboards 01, 08 and 10: a DIV whose child svg has role img and
// an aria-label (the picture), or a DIV whose child svg is aria-hidden true beside the source
// name in text (the placeholder). Each image in the boundary (the outermost img, svg or role
// img) is decorative (aria-hidden true on it or on an element up to the boundary, role
// presentation or none, or an img with an empty alt) or has a text alternative (aria-labelledby
// text, aria-label, a non-empty img alt, an svg title or a title attribute), or is neither. The
// boundary reads 'alternative' when an image has one and none is neither, 'decorative' when
// every image is decorative or the boundary itself is aria-hidden, and 'neither' while it holds
// no image or any image is neither. Other text in it (the source name) is neither required to
// name it nor hidden. direct is true when the testid element is itself the image. An element
// not yet present reads 'neither'.
type ImageSemantics = { state: 'alternative' | 'decorative' | 'neither'; direct: boolean };
async function imageSemantics(target: Locator): Promise<ImageSemantics> {
  return target.evaluate((boundary): ImageSemantics => {
    const isImage = (el: Element) => el.localName === 'img' || el.localName === 'svg' || el.getAttribute('role') === 'img';
    const hidden = (el: Element) => {
      for (let node: Element | null = el; node; node = node === boundary ? null : node.parentElement) {
        if (node.getAttribute('aria-hidden') === 'true') return true;
      }
      return false;
    };
    const classify = (el: Element): ImageSemantics['state'] => {
      const role = el.getAttribute('role');
      if (hidden(el) || role === 'presentation' || role === 'none'
        || (el.localName === 'img' && el.getAttribute('alt') === '')) return 'decorative';
      const labelled = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
      const svgTitle = el.localName === 'svg'
        ? Array.from(el.children).filter((child) => child.localName === 'title').map((child) => child.textContent ?? '').join(' ') : '';
      const named = [el.getAttribute('aria-label'), labelled, el.localName === 'img' ? el.getAttribute('alt') : '', svgTitle, el.getAttribute('title')]
        .some((value) => (value ?? '').trim() !== '');
      return named ? 'alternative' : 'neither';
    };
    if (boundary.getAttribute('aria-hidden') === 'true') return { state: 'decorative', direct: true };
    if (isImage(boundary)) return { state: classify(boundary), direct: true };
    const all = Array.from(boundary.getElementsByTagName('*')).filter(isImage);
    const states = all.filter((el) => !all.some((other) => other !== el && other.contains(el))).map(classify);
    if (states.length === 0 || states.includes('neither')) return { state: 'neither', direct: false };
    return { state: states.includes('alternative') ? 'alternative' : 'decorative', direct: false };
  }, undefined, { timeout: 1_000 }).catch((): ImageSemantics => ({ state: 'neither', direct: false }));
}

// AC-24c's rule for one image (51: each image has a text alternative or is marked
// decorative), read inside the testid boundary (imageSemantics) and waited on until it
// reaches one of the two states, never decided on one sample (round 20 R20-5). Where the
// testid element is itself the image, its text alternative is also confirmed by the computed
// accessible name. A boundary that stays neither fails.
export async function expectAltOrDecorative(target: Locator, why: string): Promise<void> {
  let seen: ImageSemantics = { state: 'neither', direct: false };
  await expect
    .poll(async () => (seen = await imageSemantics(target)).state, { message: `${why}: a text alternative or marked decorative` })
    .not.toBe('neither');
  if (seen.state === 'alternative' && seen.direct) {
    await expect(target, `${why}: the text alternative`).toHaveAccessibleName(/\S/);
  }
}

// AC-10a's stricter rule (46: the licensed image shows with its text alternative): the
// image inside the testid boundary has a text alternative; decorative or neither fails.
export async function expectTextAlternative(target: Locator, why: string): Promise<void> {
  let seen: ImageSemantics = { state: 'neither', direct: false };
  await expect
    .poll(async () => (seen = await imageSemantics(target)).state, { message: `${why}: a text alternative` })
    .toBe('alternative');
  if (seen.direct) {
    await expect(target, `${why}: the text alternative`).toHaveAccessibleName(/\S/);
  }
}

// The box of an element, or null while it has none.
export async function box(locator: Locator): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return locator.boundingBox();
}
