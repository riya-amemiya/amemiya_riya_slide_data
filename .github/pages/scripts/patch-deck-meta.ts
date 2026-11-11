import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const site = resolve(process.argv[2]);
const siteUrl = (process.argv[3] ?? "").replace(/\/$/, "");

readdirSync(site, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .forEach((entry) =>
    ["index.html", "404.html"]
      .map((file) => join(site, entry.name, file))
      .filter((path) => existsSync(path))
      .forEach((path) =>
        writeFileSync(
          path,
          readFileSync(path, "utf8")
            .replace(/(<meta property="og:title" content="[^"]*?) - Slidev"/, '$1"')
            .replace(/(<meta property="og:image" content=")\.\/([^"]*")/, (match, head, tail) =>
              siteUrl ? `${head}${siteUrl}/${entry.name}/${tail}` : match,
            ),
        ),
      ),
  );
