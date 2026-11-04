// Small DOM helpers shared by the screens. Every text reaches the page as a text node
// (Node.append of a string), never as markup, so stored item text stays inert (B-03).
type Attributes = Record<string, string>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

const SVG = 'http://www.w3.org/2000/svg';

// A decorative line icon (aria-hidden) from one fixed path of the design's artboards.
export function icon(size: number, path: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  for (const [name, value] of Object.entries({ width: `${size}`, height: `${size}`, viewBox: '0 0 24 24', 'aria-hidden': 'true' })) {
    svg.setAttribute(name, value);
  }
  const line = document.createElementNS(SVG, 'path');
  for (const [name, value] of Object.entries({
    d: path,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })) {
    line.setAttribute(name, value);
  }
  svg.append(line);
  return svg;
}
