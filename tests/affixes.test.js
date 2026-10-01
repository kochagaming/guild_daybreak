const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
    if (["js/ui.js", "js/main.js"].includes(file)) continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}
let game = load();
for (const [id, hitRate] of [["wooden_sword", .02], ["iron_sword", .03], ["steel_sword", .04], ["short_bow", .05], ["hunter_bow", .07], ["arcane_staff", .04], ["tempest_bow", .1]]) {
  const item = { templateId: id, qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 } };
  assert(Math.abs(game.Items.effects(item).hitRate - hitRate) < 1e-9, `${id}の固定命中補正`);
}
assert.strictEqual(game.Items.effects({ templateId: "iron_armor", qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 } }).hitRate, 0);
assert(Math.abs(game.Items.effects({ templateId: "wooden_sword", qualityId: "fine", modifiers: { hp: 0, attack: 0, defense: 0 } }).hitRate - .06) < 1e-9, "品質倍率を固定命中へ適用");
for (const [id, physical, magic, healing] of [["arcane_staff", 2, 16, 13], ["spirit_staff", 3, 18, 14], ["sentinel_staff", 2, 15, 12]]) {
  const base = game.GameData.items[id];
  assert.strictEqual(base.attack, physical);
  assert.strictEqual(base.magicAttack, magic);
  assert.strictEqual(base.magicHealing, healing);
  const staff = { templateId: id, qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 } };
  const before = game.Items.effects(staff), after = game.Items.effects({ ...staff, upgradeLevel: 7 });
  assert.strictEqual(after.attack, before.attack);
  assert.strictEqual(after.magicAttack, before.magicAttack + 14);
  assert.strictEqual(after.magicHealing, before.magicHealing + 14);
}
const collected = new Set(), samples = {};
for (const templateId of ["iron_sword", "short_bow", "arcane_staff", "cloth_clothes", "leather_armor", "iron_armor"]) {
  const counts = {};
  for (let seed = 1; seed <= 500; seed++) {
    const item = game.Items.createInstance(templateId, { seed, qualityId: "divine" });
    const stats = Object.entries(item.modifiers).filter(([, value]) => value);
    assert(stats.length >= 2 && stats.length <= 3);
    stats.forEach(([key, value]) => { assert(Number.isInteger(value) && value > 0); collected.add(key); counts[key] = (counts[key] || 0) + 1; });
    const repeated = game.Items.createInstance(templateId, { seed, qualityId: "divine" });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(item.modifiers)), JSON.parse(JSON.stringify(repeated.modifiers)));
  }
  samples[templateId] = counts;
}
assert.strictEqual(collected.size, 10);
assert(samples.arcane_staff.magicAttack > samples.arcane_staff.attack);
assert(samples.short_bow.hitRate > samples.short_bow.magicAttack);
assert(samples.short_bow.attackCount > samples.iron_armor.attackCount);
assert(samples.cloth_clothes.evasionRate > samples.cloth_clothes.attack);
assert(samples.iron_armor.defense > samples.iron_armor.speed);
// Discard sampling gear so backup size/quantity limits do not mask validation.
game.GameState.data.inventory.equipment.splice(2);
const id = require("./helpers").createCharacter(game, "追加性能試験", "mage", "elf", "arcane").id;
const hero = game.Characters.get(id), before = game.Characters.stats(hero);
const item = game.Items.createInstance("wooden_sword", { qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0, magicAttack: 3, magicDefense: 2, magicHealing: 4, speed: 2, hitRate: 3, evasionRate: 4, attackCount: 1 } });
assert(game.Items.equip(id, item.id).ok);
const after = game.Characters.stats(hero);
assert(after.magicAttack > before.magicAttack && after.magicDefense > before.magicDefense && after.magicHealing > before.magicHealing);
assert(Math.abs(after.hitRate - before.hitRate - .05) < 1e-9);
assert(Math.abs(after.evasionRate - before.evasionRate - .04) < 1e-9);
assert.strictEqual(after.speed, before.speed + 2);
assert(after.attackCount >= before.attackCount + 1);
const legacy = game.Items.createInstance("cloth_clothes", { modifiers: { hp: 8, attack: 0, defense: 2 }, qualityId: "standard" });
assert.strictEqual(game.Items.effects(legacy).speed, 0);
assert.strictEqual(game.Items.effects(legacy).hitRate, 0);
game.Party.toggle(id);
async function run() {
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow" })).ok);
  const snapshot = JSON.stringify(game.GameState.data.expeditions[0].partySnapshot[0].stats);
  assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].stats.speed, after.speed);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  for (const [key, value] of [["hitRate", .03], ["evasionRate", 101], ["speed", -1], ["attackCount", 4], ["magicHealing", "4"]]) {
    const bad = JSON.parse(JSON.stringify(game.GameState.data));
    bad.inventory.equipment.find(entry => entry.id === item.id).modifiers[key] = value;
    assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
  }
  game.Items.unequip(id, item.id);
  assert.strictEqual(JSON.stringify(game.GameState.data.expeditions[0].partySnapshot[0].stats), snapshot);
  game = load();
  assert.strictEqual(game.Items.getInstance(item.id).modifiers.hitRate, 3);
  assert.strictEqual(JSON.stringify(game.GameState.data.expeditions[0].partySnapshot[0].stats), snapshot);
  now += 30000; await game.GameClient.execute("expedition.collect");
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  console.log("Affix test passed: weapon base accuracy/quality scaling, all ten random stats, equipment-type tendencies, additive rate/speed/attack-count and magic effects, legacy gear, backups/validation, snapshot isolation and offline reload");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
