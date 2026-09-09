import { indexVideo } from "../src/indexers/video.js";

const file = process.argv[2] ?? "GPT_Astra_AI_Video_Automation.mp4";
await indexVideo(file);
