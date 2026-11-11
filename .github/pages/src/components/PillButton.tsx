import type { ReactNode } from "react";

const sizes = {
  md: "px-3.5 py-2 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
};

type Props = {
  pressed: boolean;
  size?: keyof typeof sizes;
  onClick: () => void;
  children: ReactNode;
};

export const PillButton = ({ pressed, size = "md", onClick, children }: Props) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    className={`cursor-pointer rounded-full border leading-none transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${sizes[size]} ${
      pressed
        ? "border-ink bg-ink text-paper"
        : "border-line text-muted hover:border-muted hover:text-ink"
    }`}
  >
    {children}
  </button>
);
