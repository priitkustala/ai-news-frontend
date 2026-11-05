// The install hint of a Safari tab (priitkustala/ai-news-frontend#3, S-18 plan step 3; B-23,
// artboard 15 of the design handoff): the manual steps that add the client to the Home
// Screen. It is shown only when the page is not running as the Home Screen web app, and is
// then left out of the page entirely. No push control belongs here: S-15 adds one in the
// Home Screen context only.

// iOS Safari reports the Home Screen web app as navigator.standalone; other browsers report
// it through the display-mode media query, which the manifest's display standalone sets.
export function isHomeScreenWebApp(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia('(display-mode: standalone)').matches;
}

const svgNs = 'http://www.w3.org/2000/svg';

// The share glyph of artboard 15, drawn beside the text and hidden from assistive technology.
function shareGlyph(): SVGSVGElement {
  const svg = document.createElementNS(svgNs, 'svg');
  for (const [name, value] of Object.entries({ width: '24', height: '24', viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'shrink-0' })) {
    svg.setAttribute(name, value);
  }
  const path = document.createElementNS(svgNs, 'path');
  for (const [name, value] of Object.entries({
    d: 'M12 3v12M8 7l4-4 4 4M5 11v9h14v-9',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })) {
    path.setAttribute(name, value);
  }
  svg.append(path);
  return svg;
}

// The hint block in a Safari tab, or null in the Home Screen web app.
export function installHint(): HTMLElement | null {
  if (isHomeScreenWebApp()) return null;
  const text = document.createElement('p');
  text.textContent = 'Add AI news to your Home Screen: tap Share, then Add to Home Screen, turn on Open as Web App, and tap Add.';
  const hint = document.createElement('aside');
  hint.setAttribute('class', 'mx-4 mt-3 mb-1 flex items-center gap-2.5 rounded-xl bg-[#eef2fb] px-3.5 py-3 text-sm text-foreground');
  hint.setAttribute('data-testid', 'install-hint');
  hint.setAttribute('aria-label', 'Add to Home Screen');
  hint.append(shareGlyph(), text);
  return hint;
}
