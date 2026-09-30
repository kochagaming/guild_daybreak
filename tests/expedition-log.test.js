const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), listeners = {}, nodes = new Map();
let now = 1700000000000;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", dataset: {}, scrollTop: 0, focus() {}, classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: selector => node(selector), querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .42 });
}
const game = context.window, create = require("./helpers").createCharacter;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, disabled: false, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? button : null } });
}

async function run() {
  game.GameState.reset();
  for (const [name, job] of [["盾役", "warrior"], ["術師", "mage"], ["癒し手", "cleric"]]) {
    const hero = game.Characters.get(create(game, name, job).id);
    hero.level = 20;
    game.Party.toggle(hero.id);
  }
  assert(game.Dungeon.start("meadow", 0, 2).ok);
  const expedition = game.GameState.data.expeditions[0];
  const planned = game.ExpeditionLog.preview(expedition);
  const kinds = planned.battleLog.map(entry => entry.kind);
  assert(kinds.includes("arrival") && kinds.includes("explore") && kinds.includes("story") && kinds.includes("treasure") && kinds.includes("stairs"));
  assert(planned.battleLog.some(entry => entry.kind === "story" && entry.sceneId === game.GameData.dungeons.meadow.discoveryStoryId), "Dungeon story discovery should appear in the live exploration record");
  assert(kinds.includes("treasureGold") || kinds.includes("treasureItem"));
  assert(kinds.indexOf("arrival") < kinds.indexOf("encounter"), "Exploration must be recorded before the floor battle");
  const opening = game.ExpeditionLog.active(expedition, expedition.startedAt);
  assert(opening.setup.length && opening.events.length === 0);
  const middle = game.ExpeditionLog.active(expedition, expedition.startedAt + (expedition.endsAt - expedition.startedAt) * .5);
  assert(middle.events.length > 0 && middle.events[0].entries.some(entry => entry.kind === "encounter"));
  assert(middle.events.every(event => event.entries.every(entry => entry.encounter === event.number)));

  game.UI.init(); game.UI.navigate("party"); await click("party-view", { view: "adventure" });
  now = expedition.startedAt + (expedition.endsAt - expedition.startedAt) * .5;
  game.UI.render();
  let html = node("app").innerHTML;
  assert(html.includes("LIVE ADVENTURE LOG") && html.includes("探索の記録"));
  assert(html.includes("journey-entry journey-encounter") && html.includes("battle-log-entry") && html.includes("journey-discovery"));
  assert(!html.includes("dungeon-grid"), "Destination cards should be replaced by the live log while exploring");

  now = expedition.endsAt;
  const result = game.Dungeon.completeIfReady(now);
  assert(result && JSON.stringify(result.battleLog) === JSON.stringify(planned.battleLog), "Live preview and completed battle log must be identical");
  assert(game.Story.ensure().facts.discoveries.includes("meadow"), "Returning from exploration should archive its discovered story clue");
  await click("party-view", { view: "results" });
  html = node("app").innerHTML;
  assert(html.includes("ADVENTURE LOG") && html.includes("探索の記録"));
  assert(html.includes("journey-conclusion") && html.includes("battle-log-list"));
  assert(!html.includes("戦闘ログを見る"), "Battle logs should be nested in encounter entries instead of a separate panel");
  console.log("Expedition log test passed: deterministic live reveal, story discoveries, arrival/search/treasure/stairs rows, nested encounter battles and completed journal reuse");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
