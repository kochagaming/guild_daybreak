const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, setTimeout, clearTimeout,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;

const phases = [
  { chapter: "prologue", tier: 1, dungeon: "meadow", materials: ["wind_grass", "beast_sinew"], equipment: ["greenwood_staff", "windrunner_vest", "hornstring_bow"] },
  { chapter: "roadside", tier: 2, dungeon: "cave", materials: ["glow_crystal", "spider_silk"], equipment: ["glowsteel_sword", "silkweave_robe", "delver_shield"] },
  { chapter: "seal", tier: 3, dungeon: "ruins", materials: ["ancient_fragment", "soul_ash"], equipment: ["relic_rapier", "soul_veil", "grave_gauntlets"] },
  { chapter: "starfall", tier: 4, dungeon: "observatory", materials: ["storm_feather", "starsteel_ore"], equipment: ["comet_staff", "stormcloak", "astral_katana"] }
];

function monsterIds(dungeon) {
  return new Set(game.GameData.dungeons[dungeon].encounters.flatMap(encounter => encounter.groups.flat()));
}

for (const phase of phases) {
  const residents = monsterIds(phase.dungeon);
  phase.materials.forEach(materialId => {
    const material = game.GameData.items[materialId];
    assert(material && material.type === "material", `${materialId} must be a material master record`);
    const carriers = Object.values(game.GameData.monsters).filter(monster => (game.GameData.relations.monsterMaterialDrops[monster.id] || []).some(drop => drop.itemId === materialId));
    assert(carriers.length && carriers.every(monster => residents.has(monster.id)), `${materialId} must only drop in ${phase.dungeon}`);
    assert.deepStrictEqual(Array.from(game.Blacksmith.materialSources(materialId)), [game.GameData.dungeons[phase.dungeon].shortName]);
  });
  phase.equipment.forEach(itemId => {
    const item = game.GameData.items[itemId];
    const recipe = game.GameData.recipes.find(entry => entry.resultId === itemId);
    assert(item && item.craftOnly && item.tier === phase.tier && item.weight > 0, `${itemId} needs its chapter tier and crafting-only equipment data`);
    assert(recipe && recipe.unlockAfter === phase.chapter, `${itemId} needs a ${phase.chapter} recipe`);
    assert(!Object.prototype.hasOwnProperty.call(recipe, "category"), `${recipe.id} must derive its category from the result item`);
    assert(Object.keys(recipe.materials).some(id => phase.materials.includes(id)), `${recipe.id} must consume its chapter material`);
  });
}

assert(game.GameData.items.greenwood_staff.magicAttack > 0 && game.GameData.items.greenwood_staff.magicHealing > 0);
assert(game.GameData.items.windrunner_vest.speed > 0 && game.GameData.items.windrunner_vest.evasionRate > 0);
assert(game.GameData.items.delver_shield.defense > game.GameData.items.silkweave_robe.defense);
assert(game.GameData.items.soul_veil.magicDefense > game.GameData.items.soul_veil.defense);
assert(game.GameData.items.astral_katana.attack > game.GameData.items.comet_staff.attack && game.GameData.items.astral_katana.attackCount < 0);
assert.deepStrictEqual(Array.from(game.Blacksmith.query({ query: "雷羽" }), recipe => recipe.resultId).sort(), ["stormcloak", "astral_katana"].sort());

game.GameState.reset();
const starterRecipe = game.GameData.recipes.find(recipe => recipe.resultId === "greenwood_staff");
assert.strictEqual(game.Blacksmith.status(starterRecipe), "locked");
require("./helpers").createCharacter(game, "製作試験", "cleric");
game.Story.recordDeparture("meadow");
assert(game.GameState.data.story.completed.includes("prologue"));
game.GameState.data.gold = 1000;
for (const [id, quantity] of Object.entries(starterRecipe.materials)) game.Items.add(id, quantity, { source: "test" });
assert.strictEqual(game.Blacksmith.status(starterRecipe), "ready");
const crafted = game.Blacksmith.craft(starterRecipe.id);
assert(crafted.ok && crafted.instance.templateId === "greenwood_staff");
assert(!["name", "type", "tier", "weaponType", "magicAttack"].some(key => Object.prototype.hasOwnProperty.call(crafted.instance, key)), "Crafted saves reference master data instead of copying it");
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);

console.log("Chapter crafting content test passed: 8 staged materials, 12 distinct equipment choices, chapter unlocks, dungeon-local drops, derived recipe categories and clean crafted saves");
