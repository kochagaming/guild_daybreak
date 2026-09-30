const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
let now = 1700000000000;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
}
const game = context.window;
const html = () => node("app").innerHTML;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, classList: { contains: () => false } };
  await listeners.click({ target: { closest: () => button } });
}
async function run() {
  game.UI.init();
  assert.deepStrictEqual(Array.from(game.ObservationJournal.unread(), note => note.id), ["choosing_an_action"]);
  assert((await game.GameClient.execute("observation.read", { noteId: "choosing_an_action" })).ok);
  const id = require("./helpers").createCharacter(game, "調査隊長").id;
  game.Characters.get(id).level = 30;
  game.Party.toggle(id);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  assert(game.ObservationJournal.unread().some(note => note.id === "formation_distance"), "Departure unlocks its field note");
  now += 30000;
  const collected = await game.GameClient.execute("expedition.collect");
  assert(collected.ok && collected.result.success);
  assert.deepStrictEqual(Array.from(collected.result.newObservationIds).sort(), ["accuracy_and_flurries", "monster_spoils"]);
  game.UI.navigate("party");
  await click("party-open", { party: "0", view: "results" });
  assert(html().includes("観察日記に2頁が加わりました") && html().includes("二撃目は、一撃目ほど素直ではない") && html().includes("観察日記を読む"));
  await click("open-observations");
  assert.strictEqual(node("page-title").textContent, "冒険者資料室");
  assert(html().includes("観察日記") && html().includes("獣の爪の下に残るもの"));
  const parsed = game.SaveTransfer.parse(JSON.stringify(game.GameState.data));
  assert(parsed.ok && parsed.state.observationJournal.readIds.includes("choosing_an_action"), "Read state survives save transfer");
  console.log("Observation journal test passed: persistent read state, progress unlock notices, result link and archive routing");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
