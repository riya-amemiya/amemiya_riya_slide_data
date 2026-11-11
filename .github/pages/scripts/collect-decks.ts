import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const site = process.argv[2] ? resolve(process.argv[2]) : undefined;

const toIsoDate = (value: unknown) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : typeof value === "string"
      ? value.slice(0, 10)
      : "";

const decks = readdirSync(root, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(root, entry.name, "slides.md")) &&
      (site === undefined || existsSync(join(site, entry.name, "index.html"))),
  )
  .map((entry) => ({
    name: entry.name,
    meta: Bun.YAML.parse(
      readFileSync(join(root, entry.name, "slides.md"), "utf8").match(
        /^---\r?\n([\s\S]*?)\r?\n---/,
      )![1],
    ) as {
      title?: string;
      events?: { name: string; url?: string; date?: unknown }[];
      tags?: string[];
    },
  }))
  .map(({ name, meta }) => ({
    name,
    title: meta.title ?? name,
    events: (meta.events ?? [])
      .map((event) => ({ name: event.name, url: event.url, date: toIsoDate(event.date) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    tags: meta.tags ?? [],
  }))
  .map((deck) => ({ ...deck, date: deck.events.find(({ date }) => date)?.date ?? "" }))
  .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

writeFileSync(join(here, "../src/decks.gen.json"), `${JSON.stringify(decks, null, 2)}\n`);
