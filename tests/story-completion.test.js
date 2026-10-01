const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map();
function node(id) { if (!nodes.has(id)) nodes.set(id, { id, innerHTML: "", textContent: "", addEventListener() {}, classList: { toggle() {} }, querySelectorAll: () => [] }); return nodes.get(id); }
const document = { getElementById: node, querySelector: selector => node(selector), querySelectorAll: () => [], addEventListener() {} };
const context = vm.createContext({ window: {}, document, console, Date, Math, Blob, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
game.GameState.reset();
const adventurer = require("./helpers").createCharacter(game, "星を見届けた者", "warrior");
game.Party.toggle(adventurer.id, 0);
require("./helpers").completeThrough(game, "end_of_starless_night");
game.UI.init();
const html = node("app").innerHTML;
assert(html.includes("MAIN STORY COMPLETE") && html.includes("本編完結 — 星なき夜の果て") && html.includes("15章 完結"));
assert(html.includes("名もなき宿から始まった物語を見届けました") && html.includes("全15章を達成"));
assert(html.includes("星後の神域") && html.includes("クリア後高難度 0/1攻略") && html.includes("クリア後の探索へ"));
assert(html.includes("星なき夜の終わり") && html.includes("誰のものでもない星"));
const styles = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
assert(styles.includes(".story-main-complete") && styles.includes(".story-completion-summary"));
console.log("Story completion test passed: explicit finale, epilogue, fifteen-chapter achievement and postgame route guidance");
