const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => 1700000000000, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}

const game = load(), equipment = Object.values(game.GameData.items).filter(item => ["weapon", "armor"].includes(item.type));
assert(equipment.length > 40);
equipment.forEach(item => {
  assert(Array.isArray(item.skillIds) && item.skillIds.length >= 1, `${item.id} needs fixed skills`);
  assert.strictEqual(new Set(item.skillIds).size, item.skillIds.length);
  item.skillIds.forEach(id => assert(game.GameData.equipmentSkills[id], `${item.id}:${id}`));
});

const zero = { hp: 0, attack: 0, defense: 0 };
const first = game.Items.add("iron_sword", 1, { source: "shop", modifiers: zero }).instances[0];
const second = game.Items.add("iron_sword", 1, { source: "shop", qualityId: "divine", modifiers: zero }).instances[0];
assert.deepStrictEqual(Array.from(game.EquipmentSkills.ids(first)), Array.from(game.GameData.items.iron_sword.skillIds));
assert.deepStrictEqual(Array.from(game.EquipmentSkills.ids(second)), Array.from(game.GameData.items.iron_sword.skillIds));
assert(!Object.prototype.hasOwnProperty.call(first, "equipmentSkills"));
first.upgradeLevel = 2;
assert(!game.EquipmentSkills.ids(first).includes("sword_training"));
first.upgradeLevel = 3;
assert(game.EquipmentSkills.ids(first).includes("sword_training"));
first.upgradeLevel = 6;
assert(game.EquipmentSkills.ids(first).includes("sword_mastery"));

const ordinary = game.Items.createInstance("iron_sword", { source: "shop", qualityId: "standard", modifiers: zero });
const ultra = game.Items.createInstance("iron_sword", { source: "shop", qualityId: "standard", modifiers: zero, ultraRareTitleId: "worldbreaker" });
const normalEffects = game.Items.effects(ordinary), ultraEffects = game.Items.effects(ultra);
for (const key of ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "hitRate", "evasionRate", "speed", "attackCount"]) assert.strictEqual(ultraEffects[key], normalEffects[key] * 2, key);
assert.strictEqual(ultraEffects.weight, normalEffects.weight);
assert(game.EquipmentSkills.ids(ultra).includes("ultra_worldbreaker"));
assert(game.Items.displayName(ultra).startsWith("★天地を砕く"));
assert(ultra.locked, "ultra-rare equipment must be protected on acquisition");
assert.strictEqual(game.GameData.ultraRareConfig.dropChance, .001);
const forcedDrop = game.Items.createInstance("wooden_sword", { source: "drop", qualityId: "standard", modifiers: zero, random: () => 0 });
assert(forcedDrop.ultraRareTitleId && forcedDrop.locked);
const forcedShop = game.Items.createInstance("wooden_sword", { source: "shop", qualityId: "standard", modifiers: zero, random: () => 0 });
assert.strictEqual(forcedShop.ultraRareTitleId, null, "shop purchases never roll ultra-rare titles");

const aggregated = game.EquipmentSkills.aggregate([first, first, ultra]);
assert.strictEqual(aggregated.multipliers.attack, 1.05 * 1.05);
assert.strictEqual(aggregated.physicalPower, 1.03 + .04 + .18);

first.upgradeLevel = 0;
game.GameState.save();
const saved = JSON.stringify(game.GameState.data);
assert(game.SaveTransfer.parse(saved).ok);
const unknown = JSON.parse(saved); unknown.inventory.equipment[0].ultraRareTitleId = "unknown";
assert(!game.SaveTransfer.parse(JSON.stringify(unknown)).ok);
const legacy = JSON.parse(saved); legacy.inventory.equipment[0].equipmentSkills = ["physical_power_3"];
assert(!game.SaveTransfer.parse(JSON.stringify(legacy)).ok);
console.log("Equipment skills test passed: fixed item skills, type-based upgrade skills, separate ultra-rare titles, doubled stats, protected drops and version-8 validation");
