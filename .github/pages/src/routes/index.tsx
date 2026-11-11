import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DeckCard } from "../components/DeckCard";
import { ExternalLink } from "../components/ExternalLink";
import { FilterBar } from "../components/FilterBar";
import { selectDecks, tags } from "../decks";
import { useHydrated } from "../hooks/useHydrated";

type Search = { tag?: string; sort?: "asc" };

const Home = () => {
  const hydrated = useHydrated();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tag = hydrated ? search.tag : undefined;
  const ascending = hydrated && search.sort === "asc";
  const visible = selectDecks(tag, ascending);
  const selectTag = (next: string | undefined) =>
    navigate({ search: (previous) => ({ ...previous, tag: next }) });

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-24">
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-5">
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.03em]">
          Slides
        </h1>
        <ExternalLink
          href="https://github.com/riya-amemiya"
          className="text-[0.95rem] text-muted hover:text-accent"
        >
          Riya Amemiya
        </ExternalLink>
      </header>
      <main id="main" tabIndex={-1} className="outline-none">
        <FilterBar
          tags={tags}
          tag={tag}
          ascending={ascending}
          hidden={!hydrated}
          onTagChange={selectTag}
          onSortChange={(next) =>
            navigate({ search: (previous) => ({ ...previous, sort: next ? "asc" : undefined }) })
          }
        />
        <p role="status" className="sr-only">
          {visible.length}件のスライド
        </p>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-11">
          {visible.map((deck) => (
            <li key={deck.name}>
              <DeckCard deck={deck} selectedTag={tag} onSelectTag={selectTag} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    tag: typeof search.tag === "string" && tags.includes(search.tag) ? search.tag : undefined,
    sort: search.sort === "asc" ? "asc" : undefined,
  }),
  component: Home,
});
