import { indexWebsite } from "../src/indexers/website.js";

const url =
  process.argv[2] ??
  "https://www.aajtak.in/technology/tech-news/story/australia-social-media-algorithm-my-feed-my-way-prym-dskc-2638822-2026-09-08";
await indexWebsite(url);
