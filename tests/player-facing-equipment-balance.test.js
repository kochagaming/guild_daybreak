const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const uiFiles = [
  "index.html",
  "js/ui.js",
  ...fs.readdirSync(path.join(root, "js", "ui"))
    .filter(name => name.endsWith(".js"))
    .map(name => path.join("js", "ui", name))
];
const source = uiFiles.map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
const forbidden = ["重量効率", "重量1あたり", "役割性能/重量", "効率順", 'value="efficiency"'];

for (const term of forbidden) {
  assert(!source.includes(term), `Player-facing UI must not expose the internal equipment balance term: ${term}`);
}
assert(source.includes("軽い順"), "Raw equipment weight sorting remains available without exposing efficiency scores");

console.log("Player-facing equipment balance test passed: internal efficiency labels and sorting stay hidden while raw weight remains usable");
