// The card text of a feed-item (priitkustala/ai-news#210, CARD-1): the owner rule of Decisions rows 550 and
// 1116, the story page at least two or three times the length of its card and never the other way around. The
// card is the opening of the text the story page shows: the opening whole sentences within a third of that text;
// when the first sentence alone is longer, that sentence if it is at most half; else the words of the first
// sentence within half, followed by one ellipsis. Never cut in a word, never longer than half, empty for an empty
// page text. A sentence ends at a full stop, exclamation mark or question mark followed by white space or the end.
const ELLIPSIS = '…';

// The positions just after each sentence end of text.
function sentenceEnds(text: string): number[] {
  return Array.from(text.matchAll(/[.!?](?=\s|$)/g), (match) => match.index + 1);
}

// The words of text up to its last white space within limit, followed by the ellipsis, so the result is at most
// limit long; with no white space in reach, text cut at limit minus one, followed by the ellipsis.
function wordsWithin(text: string, limit: number): string {
  const reach = text.slice(0, limit);
  const words = reach.slice(0, Math.max(reach.search(/\s\S*$/), 0)).trimEnd();
  if (words !== '') return words + ELLIPSIS;
  return limit > 1 ? text.slice(0, limit - 1) + ELLIPSIS : '';
}

export function cardText(pageText: string): string {
  const text = pageText.trim();
  if (text === '') return '';
  const third = Math.floor(text.length / 3);
  const half = Math.floor(text.length / 2);
  const ends = sentenceEnds(text);
  const opening = ends.filter((end) => end <= third).pop();
  if (opening !== undefined) return text.slice(0, opening);
  const first = ends[0] ?? text.length;
  return first <= half ? text.slice(0, first) : wordsWithin(text, half);
}
