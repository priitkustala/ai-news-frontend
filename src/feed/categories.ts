// The category filter of priitkustala/ai-news-frontend#2 (S-13), drawn after the approved
// artboard 03 (design/ai-news-app/v1): a row of chips, All first and then the categories view's
// rows in the view's order, each with its count from the database (item_count; All's count is
// their sum). A chip with count 0 stays shown. aria-pressed is the only state: the pressed chip's
// fill comes from its aria-pressed variant. Every text is set as a text node (B-03).
import { el } from '../dom.js';

export interface Category {
  id: string;
  name: string;
  item_count: number;
}

// A chip was tapped: id is the category's id, null for All; name is the chip's name.
export type SelectCategory = (id: string | null, name: string) => void;

const CHIP =
  'inline-flex min-h-[32px] min-w-[44px] items-center gap-[6px] rounded-[16px] border border-[#8A909C] bg-white px-[12px] text-[14px] text-[#1A1C21] ' +
  'aria-pressed:border-[#1F4FD1] aria-pressed:bg-[#1F4FD1] aria-pressed:text-white';

// Every tap, the pressed chip's included, presses that chip alone and calls select.
export function categoryFilter(categories: Category[], select: SelectCategory): HTMLElement {
  const total = categories.reduce((sum, category) => sum + Number(category.item_count), 0);
  const options = [
    { id: null, name: 'All', count: total },
    ...categories.map((category) => ({ id: category.id, name: category.name, count: Number(category.item_count) })),
  ];
  const buttons = options.map((option, index) =>
    el(
      'button',
      { type: 'button', class: CHIP, 'data-testid': 'category-option', 'aria-pressed': String(index === 0) },
      option.name,
      ' ',
      el('span', { class: 'font-bold', 'data-testid': 'category-count' }, String(option.count)),
    ),
  );
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      select(options[index].id, options[index].name);
    });
  });
  return el(
    'nav',
    { class: 'flex flex-wrap gap-[8px] border-b border-[#D9DCE1] px-[16px] pt-[6px] pb-[12px]', 'data-testid': 'category-filter', 'aria-label': 'Categories' },
    ...buttons,
  );
}
