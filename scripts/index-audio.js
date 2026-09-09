import { indexAudio } from "../src/indexers/audio.js";

const file = process.argv[2] ?? "all_ai_terms.mp3";
await indexAudio(file);
