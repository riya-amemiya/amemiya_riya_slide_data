import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const site = resolve(process.argv[2]);
const baseUrl = (process.argv[3] ?? "").replace(/\/$/, "");

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toIsoDate = (value) =>
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
      existsSync(join(site, entry.name, "index.html")),
  )
  .map((entry) => ({
    name: entry.name,
    meta: Bun.YAML.parse(
      readFileSync(join(root, entry.name, "slides.md"), "utf8").match(
        /^---\r?\n([\s\S]*?)\r?\n---/,
      )[1],
    ),
  }))
  .map(({ name, meta }) => ({
    name,
    title: meta.title ?? name,
    events: (meta.events ?? [])
      .map((event) => ({ ...event, date: toIsoDate(event.date) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    tags: meta.tags ?? [],
  }))
  .map((deck) => ({ ...deck, date: deck.events.find(({ date }) => date)?.date ?? "" }))
  .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

decks.forEach(({ name }) =>
  ["index.html", "404.html"]
    .map((file) => join(site, name, file))
    .filter((path) => existsSync(path))
    .forEach((path) =>
      writeFileSync(
        path,
        readFileSync(path, "utf8")
          .replace(/(<meta property="og:title" content="[^"]*?) - Slidev"/, '$1"')
          .replace(/(<meta property="og:image" content=")\.\/([^"]*")/, (match, head, tail) =>
            baseUrl ? `${head}${baseUrl}/${name}/${tail}` : match,
          ),
      ),
    ),
);

const tagCounts = decks
  .flatMap(({ tags }) => tags)
  .reduce((counts, tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1), new Map());

const tagButtons = [
  '<button type="button" data-tag="" aria-pressed="true">すべて</button>',
  ...[...tagCounts]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(
      ([tag]) =>
        `<button type="button" data-tag="${escapeHtml(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`,
    ),
].join("\n");

const cards = decks
  .map(({ name, title, date, events, tags }) =>
    [
      `<li data-date="${date}" data-tags="${escapeHtml(JSON.stringify(tags))}">`,
      `<a class="card" href="./${name}/">`,
      `<img src="./${name}/og-image.png" alt="" width="980" height="551" loading="lazy">`,
      `<span class="title">${escapeHtml(title)}</span>`,
      "</a>",
      events.length
        ? `<ul class="events">${events
            .map(
              (event) =>
                `<li><time datetime="${event.date}">${event.date.replaceAll("-", ".")}</time>${
                  event.url
                    ? `<a href="${escapeHtml(event.url)}">${escapeHtml(event.name)}</a>`
                    : `<span>${escapeHtml(event.name)}</span>`
                }</li>`,
            )
            .join("")}</ul>`
        : "",
      tags.length ? `<p class="tags">${tags.map(escapeHtml).join(" · ")}</p>` : "",
      "</li>",
    ].join(""),
  )
  .join("\n");

const description = "Riya Amemiya の登壇スライド一覧";

const meta = [
  `<meta name="description" content="${description}">`,
  '<meta property="og:title" content="Slides">',
  `<meta property="og:description" content="${description}">`,
  ...(decks.length
    ? [`<meta property="og:image" content="${baseUrl || "."}/${decks[0].name}/og-image.png">`]
    : []),
].join("\n");

writeFileSync(
  join(site, "index.html"),
  readFileSync(join(here, "index.template.html"), "utf8")
    .replace("{{meta}}", () => meta)
    .replace("{{tags}}", () => tagButtons)
    .replace("{{cards}}", () => cards),
);
