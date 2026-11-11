import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { decks } from "../decks";
import appCss from "../styles/app.css?url";

const description = "Riya Amemiya の登壇スライド一覧";
const siteUrl = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/$/, "");

const RootComponent = () => (
  <html lang="ja">
    <head>
      <HeadContent />
    </head>
    <body className="bg-paper font-sans leading-[1.6] text-ink antialiased">
      <Outlet />
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Slides" },
      { name: "description", content: description },
      { property: "og:title", content: "Slides" },
      { property: "og:description", content: description },
      ...(decks.length
        ? [
            {
              property: "og:image",
              content: `${siteUrl || "."}/${decks[0].name}/og-image.png`,
            },
          ]
        : []),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: `${import.meta.env.BASE_URL}favicon.svg` },
    ],
  }),
  component: RootComponent,
});
