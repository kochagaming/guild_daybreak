const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}
async function run() {
  let game = load();
  assert.strictEqual(game.Encyclopedia.item("wooden_sword"), 1);
  assert.strictEqual(game.Encyclopedia.item("cloth_clothes"), 1);
  assert.strictEqual(game.Encyclopedia.item("steel_sword"), 0);
  assert.strictEqual(game.Encyclopedia.monster("slime"), null);
  game.Items.add("iron_ore", 3);
  game.Items.add("iron_sword", 2, { source: "shop" });
  assert.strictEqual(game.Encyclopedia.item("iron_ore"), 3);
  assert.strictEqual(game.Encyclopedia.item("iron_sword"), 2);
  assert(game.Encyclopedia.unreadItems().includes("iron_ore") && game.Encyclopedia.unreadItems().includes("iron_sword"));
  assert((await game.GameClient.execute("encyclopedia.read", { kind: "items" })).ok);
  assert.strictEqual(game.Encyclopedia.unreadItems().length, 0);
  const stickySources = game.Encyclopedia.itemAcquisitionSources("sticky_fluid");
  assert(stickySources.monsters.some(source => source.dungeonId === "meadow" && source.monsterId === "slime" && source.difficultyId === "normal"));
  assert(stickySources.monsters.some(source => source.dungeonId === "meadow" && source.monsterId === "slime" && source.difficultyId === "divine"), "Higher difficulties inherit lower titled drops");
  const divineSources = game.Encyclopedia.itemAcquisitionSources("divine_slime_core");
  assert(divineSources.monsters.length && divineSources.monsters.every(source => source.monsterId === "slime" && source.difficultyId === "divine"));
  assert(game.Encyclopedia.itemAcquisitionSources("wooden_sword").shop, "Shop availability is retained alongside monster sources");
  const firstIronSword = game.Items.equipmentList().find(item => item.templateId === "iron_sword");
  game.Items.sell(firstIronSword.id);
  assert.strictEqual(game.Items.count("iron_sword"), 1);
  assert.strictEqual(game.Encyclopedia.item("iron_sword"), 2, "Selling must not erase discovery history");

  game.GameState.reset();
  const heroId = require("./helpers").createCharacter(game, "図鑑調査隊", "warrior").id;
  game.Characters.get(heroId).level = 50;
  game.Party.toggle(heroId);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0, timeMultiplier: 1 })).ok);
  now += 30000;
  const collected = await game.GameClient.execute("expedition.collect");
  assert(collected.ok && collected.result);
  const result = game.GameState.data.lastResult;
  assert(Object.keys(result.monsterEncounters).length > 0);
  for (const [id, count] of Object.entries(result.monsterEncounters)) {
    const entry = game.Encyclopedia.monster(id);
    assert(entry && entry.encountered >= count);
    assert(entry.defeated >= (result.monsterCounts[id] || 0));
    assert(entry.observations && entry.observations.incomingAttempts >= entry.observations.incomingHits);
  }
  assert(Object.keys(result.monsterObservations).length > 0, "Battle observations are persisted for staged research");
  assert(game.Encyclopedia.unreadMonsters().length > 0, "First encounters remain unread until the monster codex is opened");
  for (const drop of result.drops) assert(game.Encyclopedia.item(drop.itemId) >= drop.quantity);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);

  const invalidCount = JSON.parse(JSON.stringify(game.GameState.data));
  invalidCount.encyclopedia.monsters.slime = { encountered: 1, defeated: 2, observations: { incomingAttempts: 0, incomingHits: 0, enemyTurns: 0, maxAttackCount: 0, magicAttack: false, rearTargeting: false, attackElements: [], statusAttacks: [], elementWeaknesses: [], elementResistances: [], statusResisted: [], statusLanded: [], burstRounds: [], drops: [] } };
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidCount)).ok);
  const invalidItem = JSON.parse(JSON.stringify(game.GameState.data));
  invalidItem.encyclopedia.items.unknown_relic = 1;
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidItem)).ok);
  const invalidUnread = JSON.parse(JSON.stringify(game.GameState.data));
  invalidUnread.encyclopedia.unreadMonsters.push("missing_monster");
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidUnread)).ok);

  const prior = JSON.parse(JSON.stringify(game.GameState.data));
  delete prior.encyclopedia;
  storage.set(game.SaveSystem.exportKey, JSON.stringify(prior));
  game = load();
  assert(game.GameState.needsInitialSave, "Current saves from before the additive field are hydrated once");
  assert(game.Encyclopedia.item("wooden_sword") >= 1);
  assert(game.Encyclopedia.monster("alpha_wolf"), "Cleared dungeon boss is restored to the archive");
  assert((await game.GameClient.execute("progress.sync")).ok);
  assert(JSON.parse(storage.get(game.SaveSystem.exportKey)).encyclopedia);
  console.log("Encyclopedia test passed: item history, exact dungeon/monster/difficulty sources, encounters/defeats, battle integration, validation, reset and additive current-save hydration");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
