import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_SITE_URL
    ? `${new URL(process.env.VITE_SITE_URL).pathname.replace(/\/$/, "")}/`
    : "/",
  plugins: [
    tanstackStart({ prerender: { enabled: true, crawlLinks: false } }),
    viteReact(),
    tailwindcss(),
  ],
});
