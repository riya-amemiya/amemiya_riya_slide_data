import type { Deck } from "../decks";
import { EventList } from "./EventList";
import { ExternalLink } from "./ExternalLink";
import { PillButton } from "./PillButton";

type Props = {
  deck: Deck;
  selectedTag: string | undefined;
  onSelectTag: (tag: string) => void;
};

export const DeckCard = ({ deck, selectedTag, onSelectTag }: Props) => (
  <article aria-labelledby={`deck-${deck.name}`}>
    <div className="group relative rounded-xl has-focus-visible:outline-3 has-focus-visible:outline-offset-[6px] has-focus-visible:outline-accent">
      <img
        src={`${import.meta.env.BASE_URL}${deck.name}/og-image.png`}
        alt=""
        width={980}
        height={551}
        loading="lazy"
        className="block aspect-video h-auto w-full rounded-xl border border-line bg-white object-cover shadow-thumb transition duration-[250ms] group-hover:-translate-y-1 group-hover:shadow-thumb-hover group-has-focus-visible:-translate-y-1 group-has-focus-visible:shadow-thumb-hover motion-reduce:transform-none motion-reduce:transition-none dark:brightness-[0.88] dark:group-hover:brightness-100 dark:group-has-focus-visible:brightness-100"
      />
      <h2
        id={`deck-${deck.name}`}
        className="mt-3.5 px-0.5 leading-normal font-semibold text-pretty [word-break:auto-phrase] transition-colors group-hover:text-accent motion-reduce:transition-none"
      >
        <ExternalLink
          href={`${import.meta.env.BASE_URL}${deck.name}/`}
          className="block outline-none after:absolute after:inset-0 after:rounded-xl"
        >
          {deck.title}
        </ExternalLink>
      </h2>
    </div>
    {deck.events.length > 0 && <EventList events={deck.events} />}
    {deck.tags.length > 0 && (
      <ul aria-label="タグ" className="mt-2.5 flex flex-wrap gap-1.5 px-0.5">
        {deck.tags.map((name) => (
          <li key={name}>
            <PillButton size="sm" pressed={selectedTag === name} onClick={() => onSelectTag(name)}>
              {name}
              <span className="sr-only">で絞り込む</span>
            </PillButton>
          </li>
        ))}
      </ul>
    )}
  </article>
);
