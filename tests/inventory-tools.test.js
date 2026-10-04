const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");
const storage = new Map();
let fail = false;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => { if (fail) throw new Error("quota"); storage.set(key, value); },
    removeItem: key => storage.delete(key)
  } });
  ["data/masterSchema.js", "data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/equipmentSets.js", "data/skills.js", "data/jobs.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "data/monsters.js", "data/dungeons.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/monsterLoot.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/combatMath.js", "js/combatDecision.js", "js/battle.js", "js/saveTransfer.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context));
  return context.window;
}
let game = load();
const hero = require("./helpers").createCharacter(game, "保護テスト", "warrior");
assert(game.Items.setLocked("item-1", true).ok);
assert(game.Items.equip(hero.id, "item-1").ok, "ロック中でも装備できること");
assert(game.Items.unequip(hero.id, "item-1").ok);
const before = JSON.stringify(game.GameState.data.inventory), gold = game.GameState.data.gold;
assert(!game.Items.sell("item-1").ok && !game.Items.dismantle("item-1").ok);
assert.strictEqual(JSON.stringify(game.GameState.data.inventory), before);
assert.strictEqual(game.GameState.data.gold, gold);
game = load();
assert.strictEqual(game.Items.getInstance("item-1").locked, true);
const iron = game.Items.createInstance("iron_sword", { qualityId: "fine", modifiers: { hp: 8, attack: 3, defense: 2 } });
const bow = game.Items.createInstance("short_bow", { qualityId: "broken", modifiers: { hp: 0, attack: 0, defense: 0 } });
const grouped = game.Items.groupEquipment([
  iron,
  { ...iron, id: "test-same", modifiers: { hp: 8, attack: 3, defense: 2, magicAttack: 0 } },
  { ...iron, id: "test-different", modifiers: { hp: 8, attack: 4, defense: 2 } }
]);
assert.strictEqual(grouped.length, 2);
assert.strictEqual(grouped.find(group => group.instances.some(item => item.id === iron.id)).instances.length, 2, "Only functionally identical equipment shares a stack");
assert(game.Items.equip(hero.id, "item-1").ok);
const ids = options => Array.from(game.Items.queryEquipment(options), item => item.id);
assert.deepStrictEqual(ids({ kind: "weapon:sword", quality: "fine", equipped: "free", lock: "unlocked" }), [iron.id]);
assert.deepStrictEqual(ids({ kind: "weapon:bow" }), [bow.id]);
assert.deepStrictEqual(ids({ kind: "armor:cloth" }), ["item-2"]);
assert.deepStrictEqual(ids({ equipped: "equipped", lock: "locked" }), ["item-1"]);
assert.strictEqual(ids({ sort: "attack" })[0], iron.id);
assert.strictEqual(ids({ sort: "hp" })[0], iron.id);
assert.strictEqual(ids({ sort: "defense" })[0], "item-2");
assert.strictEqual(ids({ sort: "value" })[0], iron.id);
assert.strictEqual(ids({ sort: "weight" })[0], "item-2");
assert.strictEqual(ids({ kind: "weapon:sword", quality: "broken" }).length, 0);
const setStaff = game.Items.createInstance("greenwood_staff", { qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 } });
const setVest = game.Items.createInstance("windrunner_vest", { qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 } });
assert.deepStrictEqual(ids({ set: "windtrail_craft" }).sort(), [setStaff.id, setVest.id].sort());
assert(ids({ set: "any" }).includes(setStaff.id) && !ids({ set: "any" }).includes(iron.id), "組合せ装備だけを横断して探せること");
const all = JSON.stringify(game.Items.equipmentList());
assert.deepStrictEqual(ids({ sort: "newest" }), ids({ sort: "newest" }));
assert.strictEqual(JSON.stringify(game.Items.equipmentList()), all, "絞り込み・ソートで保存データを変えないこと");
game.Items.setLocked(iron.id, true);
const imported = game.SaveTransfer.parse(JSON.stringify(game.GameState.data));
assert(imported.ok);
assert(game.SaveTransfer.restore(imported.state).ok);
assert.strictEqual(game.Items.getInstance(iron.id).locked, true);
const bad = JSON.parse(JSON.stringify(game.GameState.data));
bad.inventory.equipment[0].locked = "true";
assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
fail = true;
assert(!game.Items.setLocked(iron.id, false).ok);
assert.strictEqual(game.Items.getInstance(iron.id).locked, true);
fail = false;
assert(game.Items.setLocked(iron.id, false).ok);
assert(game.Items.sell(iron.id).ok);
assert(!game.Items.setLocked("missing", true).ok);
console.log("Inventory tools test passed: lock protection, equip, persistence/import, combined filters, sort, immutability");

