import data from "./decks.gen.json";

export type DeckEvent = { name: string; url?: string; date: string };

export type Deck = {
  name: string;
  title: string;
  date: string;
  events: DeckEvent[];
  tags: string[];
};

export const decks: Deck[] = data;

export const tags = [
  ...decks
    .flatMap((deck) => deck.tags)
    .reduce(
      (counts, tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1),
      new Map<string, number>(),
    ),
]
  .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
  .map(([tag]) => tag);
