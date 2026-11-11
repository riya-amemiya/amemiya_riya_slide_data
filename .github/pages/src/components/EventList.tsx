import type { DeckEvent } from "../decks";
import { ExternalLink } from "./ExternalLink";

export const EventList = ({ events }: { events: DeckEvent[] }) => (
  <ul
    aria-label="登壇したイベント"
    className="mt-2 grid gap-0.5 px-0.5 text-[0.8125rem] leading-normal text-muted"
  >
    {events.map((event) => (
      <li key={`${event.date}${event.name}`} className="grid grid-cols-[auto_1fr] gap-2.5">
        <time dateTime={event.date} className="tabular-nums empty:hidden">
          {event.date.replaceAll("-", ".")}
        </time>
        {event.url ? (
          <ExternalLink
            href={event.url}
            className="[word-break:auto-phrase] transition-colors hover:text-accent hover:underline hover:underline-offset-[3px] focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
          >
            {event.name}
          </ExternalLink>
        ) : (
          <span>{event.name}</span>
        )}
      </li>
    ))}
  </ul>
);
