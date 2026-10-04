const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ console, Date, Math, Blob, window: {}, localStorage: {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
} });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1])
  .filter(file => !["js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window;

assert.deepStrictEqual(Object.keys(game.GameData.derived.weaponTypes), ["rapier", "sword", "katana", "bow", "staff"]);
assert.deepStrictEqual(Object.keys(game.GameData.derived.armorTypes), ["cloth", "leather", "heavy", "shield", "gauntlet"]);
for (const type of [...Object.keys(game.GameData.derived.weaponTypes), ...Object.keys(game.GameData.derived.armorTypes)]) {
  assert(game.GameData.config.affixes.profiles[type], `${type}の追加性能傾向が必要です`);
  assert(game.GameData.relations.upgradeSkillProgression[type]?.length, `${type}の固定強化スキルが必要です`);
}

const ids = ["bronze_rapier", "silver_rapier", "moon_rapier", "iron_katana", "steel_katana", "dragon_nodachi", "wooden_shield", "iron_shield", "tower_shield", "leather_gloves", "iron_gauntlets", "rune_gauntlets"];
ids.forEach(id => {
  const base = game.GameData.items[id];
  assert(base && base.weight > 0 && base.price > 0);
  const instance = game.Items.createInstance(id, { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
  assert(instance && Number.isFinite(game.Items.effects(instance).weight));
});

const thiefId = require("./helpers").createCharacter(game, "装備試験", "thief", "human", "common").id;
const thief = game.Characters.get(thiefId);
thief.level = 6;
const base = game.Characters.stats(thief);
const rapier = game.Items.createInstance("bronze_rapier", { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
assert(game.Items.equip(thiefId, rapier.id).ok);
let equipped = game.Characters.stats(thief);
assert(equipped.attack > base.attack && equipped.hitRate > base.hitRate && equipped.speed > base.speed && equipped.attackCount > base.attackCount);
assert.strictEqual(game.Characters.weaponRange(thief), "melee");
assert(game.Items.unequip(thiefId, rapier.id).ok);

const katana = game.Items.createInstance("steel_katana", { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
assert(game.Items.equip(thiefId, katana.id).ok);
equipped = game.Characters.stats(thief);
assert(equipped.attack > base.attack && equipped.attackCount < base.attackCount, "刀は高火力と攻撃回数低下を両立します");
assert(game.Items.unequip(thiefId, katana.id).ok);

const shield = game.Items.createInstance("iron_shield", { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
const gauntlet = game.Items.createInstance("iron_gauntlets", { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
assert(game.Items.equip(thiefId, shield.id).ok && game.Items.equip(thiefId, gauntlet.id).ok);
equipped = game.Characters.stats(thief);
assert(equipped.defense > base.defense && equipped.magicDefense > base.magicDefense);
assert(equipped.attack > base.attack && equipped.hitRate > base.hitRate && equipped.speed > base.speed);

for (const id of ["silver_rapier", "steel_katana", "iron_shield", "iron_gauntlets", "moon_rapier", "dragon_nodachi", "tower_shield", "rune_gauntlets"]) {
  assert(game.GameData.recipes.some(recipe => recipe.resultId === id), `${id}の製作レシピが必要です`);
}
for (const id of ["bronze_rapier", "iron_katana", "wooden_shield", "leather_gloves", "moon_rapier", "dragon_nodachi"]) {
  assert(Object.values(game.GameData.dungeons).some(dungeon => dungeon.drops.some(drop => drop.itemId === id)), `${id}の探索入手先が必要です`);
}
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
console.log("Equipment type test passed: rapiers, katanas, shields and gauntlets, distinct stats, affinities, affixes, skills, recipes, drops and save compatibility");
