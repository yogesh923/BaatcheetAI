import { indexPdf } from "../src/indexers/pdf.js";

const file = process.argv[2] ?? "the_bhagavad_gita.pdf";
await indexPdf(file);
