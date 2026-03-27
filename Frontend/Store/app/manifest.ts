import type { MetadataRoute } from "next";
import { DEFAULT_SITE_ICON_PATH, STORE_SITE_NAME } from "./lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: STORE_SITE_NAME,
    short_name: "NexuStore",
    description:
      "Shop technology, gaming, electronics, components, and accessories at TheNexuStore.",
    start_url: "/store",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0b123a",
    categories: ["shopping", "technology", "electronics"],
    icons: [
      {
        src: DEFAULT_SITE_ICON_PATH,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
