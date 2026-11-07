// The tab bar of priitkustala/ai-news#51 (S-16), drawn after the approved artboard 13
// (design/ai-news-app/v1): Feed and Bookmarks, fixed at the bottom of the viewport, each tab at
// least 64 by 48, the selected one bold and blue with aria-current page. A tap selects a tab
// in place: no history entry and no routing, so a reload starts on the Feed tab.
import { BOOKMARK } from './bookmarks/control.js';
import { el, icon } from './dom.js';

export type Tab = 'feed' | 'bookmarks';

const FEED = 'M4 6h16M4 12h16M4 18h10';
const TAB =
  'flex min-h-12 min-w-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-[#545A66] aria-[current=page]:font-bold aria-[current=page]:text-[#1F4FD1]';

// Marks tab as the selected one.
export function markTab(bar: HTMLElement, tab: Tab): void {
  for (const link of bar.querySelectorAll<HTMLElement>('a[data-tab]')) {
    if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

export function tabBar(select: (tab: Tab) => void): HTMLElement {
  const link = (tab: Tab, path: string, name: string) => {
    const node = el('a', { class: TAB, href: `#${tab}`, 'data-tab': tab, 'data-testid': `nav-${tab}` }, icon(22, path), name);
    node.addEventListener('click', (event) => {
      event.preventDefault();
      markTab(bar, tab);
      select(tab);
    });
    return node;
  };
  const bar = el('nav', {
    class: 'fixed bottom-0 left-1/2 z-20 flex w-full max-w-[393px] -translate-x-1/2 border-t border-[#D9DCE1] bg-white px-2 pt-1 pb-[22px]',
    'aria-label': 'Screens',
  });
  bar.append(link('feed', FEED, 'Feed'), link('bookmarks', BOOKMARK, 'Bookmarks'));
  markTab(bar, 'feed');
  return bar;
}
