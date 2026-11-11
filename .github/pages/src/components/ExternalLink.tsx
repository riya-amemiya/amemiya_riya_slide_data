import type { ComponentProps } from "react";

export const newTabHintId = "new-tab-hint";

export const NewTabHint = () => (
  <span id={newTabHintId} hidden>
    新しいタブで開く
  </span>
);

export const ExternalLink = (props: Omit<ComponentProps<"a">, "target" | "rel">) => (
  <a {...props} target="_blank" rel="noreferrer" aria-describedby={newTabHintId} />
);
