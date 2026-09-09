import { indexYoutube } from "../src/indexers/youtube.js";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/index-youtube.js <youtube-url>");
  process.exit(1);
}

await indexYoutube(url);
