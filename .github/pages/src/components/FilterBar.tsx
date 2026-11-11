import type { ReactNode } from "react";
import { PillButton } from "./PillButton";

const Group = ({ legend, children }: { legend: string; children: ReactNode }) => (
  <fieldset className="flex min-w-0 flex-wrap gap-2">
    <legend className="sr-only">{legend}</legend>
    {children}
  </fieldset>
);

type Props = {
  tags: string[];
  tag: string | undefined;
  ascending: boolean;
  hidden: boolean;
  onTagChange: (tag: string | undefined) => void;
  onSortChange: (ascending: boolean) => void;
};

export const FilterBar = ({ tags, tag, ascending, hidden, onTagChange, onSortChange }: Props) => (
  <search
    hidden={hidden}
    aria-label="スライドの絞り込みと並び替え"
    className="mb-9 flex flex-wrap items-start justify-between gap-x-6 gap-y-4"
  >
    <Group legend="タグで絞り込む">
      <PillButton pressed={tag === undefined} onClick={() => onTagChange(undefined)}>
        すべて
      </PillButton>
      {tags.map((name) => (
        <PillButton key={name} pressed={tag === name} onClick={() => onTagChange(name)}>
          {name}
        </PillButton>
      ))}
    </Group>
    <Group legend="並び順">
      <PillButton pressed={!ascending} onClick={() => onSortChange(false)}>
        新しい順
      </PillButton>
      <PillButton pressed={ascending} onClick={() => onSortChange(true)}>
        古い順
      </PillButton>
    </Group>
  </search>
);
