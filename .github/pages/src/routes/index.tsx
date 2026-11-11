import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { decks, tags } from "../decks";

type Search = { tag?: string; sort?: "asc" };

const subscribe = () => () => {};

const pill =
  "cursor-pointer rounded-full border leading-none transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";

const pillState = (pressed: boolean) =>
  pressed
    ? "border-ink bg-ink text-paper"
    : "border-line text-muted hover:border-muted hover:text-ink";

const Home = () => {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tag = hydrated ? search.tag : undefined;
  const ascending = hydrated && search.sort === "asc";

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-24">
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-5">
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.03em]">
          Slides
        </h1>
        <a
          href="https://github.com/riya-amemiya"
          target="_blank"
          rel="noreferrer"
          className="text-[0.95rem] text-muted hover:text-accent"
        >
          Riya Amemiya
        </a>
      </header>
      <main>
        <div
          hidden={!hydrated}
          className="mb-9 flex flex-wrap items-start justify-between gap-x-6 gap-y-4"
        >
          <div role="group" aria-label="タグ" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={tag === undefined}
              onClick={() => navigate({ search: ({ sort }) => ({ sort }) })}
              className={`${pill} px-3.5 py-2 text-sm ${pillState(tag === undefined)}`}
            >
              すべて
            </button>
            {tags.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={tag === name}
                onClick={() => navigate({ search: (previous) => ({ ...previous, tag: name }) })}
                className={`${pill} px-3.5 py-2 text-sm ${pillState(tag === name)}`}
              >
                {name}
              </button>
            ))}
          </div>
          <div role="group" aria-label="並び順" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!ascending}
              onClick={() => navigate({ search: ({ tag: current }) => ({ tag: current }) })}
              className={`${pill} px-3.5 py-2 text-sm ${pillState(!ascending)}`}
            >
              新しい順
            </button>
            <button
              type="button"
              aria-pressed={ascending}
              onClick={() => navigate({ search: (previous) => ({ ...previous, sort: "asc" }) })}
              className={`${pill} px-3.5 py-2 text-sm ${pillState(ascending)}`}
            >
              古い順
            </button>
          </div>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-11">
          {(ascending
            ? [...decks].sort(
                (a, b) => Number(!a.date) - Number(!b.date) || a.date.localeCompare(b.date),
              )
            : decks
          )
            .filter((deck) => tag === undefined || deck.tags.includes(tag))
            .map((deck) => (
              <li key={deck.name}>
                <a
                  href={`${import.meta.env.BASE_URL}${deck.name}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-xl focus-visible:outline-3 focus-visible:outline-offset-[6px] focus-visible:outline-accent"
                >
                  <img
                    src={`${import.meta.env.BASE_URL}${deck.name}/og-image.png`}
                    alt=""
                    width={980}
                    height={551}
                    loading="lazy"
                    className="block aspect-video h-auto w-full rounded-xl border border-line bg-white object-cover shadow-thumb transition duration-[250ms] group-hover:-translate-y-1 group-hover:shadow-thumb-hover group-focus-visible:-translate-y-1 group-focus-visible:shadow-thumb-hover motion-reduce:transform-none motion-reduce:transition-none dark:brightness-[0.88] dark:group-hover:brightness-100 dark:group-focus-visible:brightness-100"
                  />
                  <span className="mt-3.5 block px-0.5 leading-normal font-semibold text-pretty [word-break:auto-phrase] transition-colors group-hover:text-accent motion-reduce:transition-none">
                    {deck.title}
                  </span>
                </a>
                {deck.events.length > 0 && (
                  <ul className="mt-2 grid gap-0.5 px-0.5 text-[0.8125rem] leading-normal text-muted">
                    {deck.events.map((event) => (
                      <li
                        key={`${event.date}${event.name}`}
                        className="grid grid-cols-[auto_1fr] gap-2.5"
                      >
                        <time dateTime={event.date} className="tabular-nums empty:hidden">
                          {event.date.replaceAll("-", ".")}
                        </time>
                        {event.url ? (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noreferrer"
                            className="[word-break:auto-phrase] transition-colors hover:text-accent hover:underline hover:underline-offset-[3px] focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                          >
                            {event.name}
                          </a>
                        ) : (
                          <span>{event.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {deck.tags.length > 0 && (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5 px-0.5">
                    {deck.tags.map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          aria-pressed={tag === name}
                          onClick={() =>
                            navigate({ search: (previous) => ({ ...previous, tag: name }) })
                          }
                          className={`${pill} px-2.5 py-1.5 text-xs ${pillState(tag === name)}`}
                        >
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
