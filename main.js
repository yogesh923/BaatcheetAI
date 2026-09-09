import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import ask from "./src/queryService.js";

const rl = new readline.createInterface({
  input,
  output,
});

const userQuery = await rl.question("ask anything about bhagvad geeta: ");

await ask(userQuery);

rl.close();
