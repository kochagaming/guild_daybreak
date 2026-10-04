const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const storage = new Map();
const context = vm.createContext({ window: {}, Date, Math, Blob, localStorage: {
  getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)
} });
["data/masterSchema.js", "data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "data/monsters.js", "data/dungeons.js", "data/recipes.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/encyclopedia.js", "js/items.js", "js/shop.js", "js/party.js", "js/monsterLoot.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/combatMath.js", "js/combatDecision.js", "js/battle.js", "js/dungeon.js", "js/blacksmith.js", "js/saveTransfer.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context));
const game = context.window;
Object.values(game.GameData.monsters).forEach(monster => {
  const materialDrops = game.MonsterLoot.materialDrops(monster);
  assert(materialDrops.length > 0);
  assert(!Object.prototype.hasOwnProperty.call(monster, "materialDrops"));
  materialDrops.forEach(drop => {
    assert(game.GameData.items[drop.itemId].type === "material");
    assert(drop.chance >= 0 && drop.chance <= 1 && drop.quantity[0] >= 1 && drop.quantity[1] >= drop.quantity[0]);
  });
});
game.GameData.monsters.weak = { id: "weak", name: "弱い敵", hp: 1, attack: 0, defense: 0, speed: 0 };
game.GameData.monsters.killer = { id: "killer", name: "強い敵", hp: 9999, attack: 9999, defense: 0, speed: 0 };
game.GameData.relations.monsterMaterialDrops.weak = [{ itemId: "slime_gel", chance: 1, quantity: [2, 2] }];
game.GameData.relations.monsterMaterialDrops.killer = [{ itemId: "beast_fang", chance: 1, quantity: [3, 3] }];
const dungeon = { name: "試験", encounters: [{ name: "試験戦", groups: [["weak", "killer"]] }], rewards: { gold: [0, 0], exp: [0, 0] }, drops: [] };
const expedition = { seed: 1, partyIds: [], partySnapshot: [{ id: "test", name: "冒険者", jobId: "warrior", level: 1, position: 0, skillIds: [], stats: { hp: 50, attack: 20, defense: 0, speed: 100, criticalRate: 0 } }] };
let partial;
for (let seed = 1; seed <= 100; seed++) {
  expedition.seed = seed;
  partial = game.Battle.resolve(expedition, dungeon);
  if (partial.monstersDefeated === 1) break;
}
assert(!partial.success && partial.monstersDefeated === 1);
assert.strictEqual(partial.drops.length, 1);
assert.strictEqual(partial.drops[0].itemId, "slime_gel");
assert.strictEqual(partial.drops[0].quantity, 2);
assert(partial.battleLog.some(entry => entry.text.includes("素材ドロップ")));
dungeon.encounters[0].groups = [["weak", "weak"]];
const guaranteed = game.Battle.resolve(expedition, dungeon);
assert(guaranteed.success && guaranteed.drops.length === 1 && guaranteed.drops[0].quantity === 4);
assert.strictEqual(JSON.stringify(guaranteed), JSON.stringify(game.Battle.resolve(expedition, dungeon)));
game.GameData.relations.monsterMaterialDrops.weak[0].chance = 0;
const noDrops = game.Battle.resolve(expedition, dungeon);
assert.strictEqual(noDrops.drops.length, 0);
assert.strictEqual(noDrops.success, guaranteed.success);
assert.strictEqual(noDrops.encountersCleared, guaranteed.encountersCleared);
const before = JSON.stringify(game.GameState.data);
assert(!game.Blacksmith.craft("forge_fang_blade").ok);
assert.strictEqual(JSON.stringify(game.GameState.data), before);
game.GameState.data.gold = 1000;
for (const id of ["forge_fang_blade", "forge_hide_robe", "forge_spirit_staff"]) {
  const recipe = game.GameData.recipes.find(entry => entry.id === id);
  Object.entries(recipe.materials).forEach(([itemId, quantity]) => game.Items.add(itemId, quantity));
  const gold = game.GameState.data.gold;
  const counts = Object.fromEntries(Object.keys(recipe.materials).map(itemId => [itemId, game.Items.count(itemId)]));
  const result = game.Blacksmith.craft(id);
  assert(result.ok && result.instance.templateId === recipe.resultId && result.instance.source === "craft");
  assert.strictEqual(game.GameState.data.gold, gold - recipe.gold);
  Object.entries(recipe.materials).forEach(([itemId, quantity]) => assert.strictEqual(game.Items.count(itemId), counts[itemId] - quantity));
  assert(!game.Shop.buy(recipe.resultId).ok);
}
assert(game.Blacksmith.materialSources("slime_gel").includes("草原"));
assert(game.Blacksmith.materialSources("arcane_dust").includes("古代遺跡"));
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
// 通常の探索完了経路を通じて素材が保存され、再完了で重複付与されない。
game.GameData.relations.monsterMaterialDrops.slime = [{ itemId: "sticky_fluid", chance: 1, quantity: [1, 1] }];
game.GameData.dungeons.meadow.encounters = [{ name: "試験", groups: [["slime", "slime"]] }];
const hero = game.Characters.get(require("./helpers").createCharacter(game, "採集者", "warrior").id);
hero.level = 30;
game.Party.toggle(hero.id);
game.Dungeon.start("meadow");
game.GameState.data.expeditions[0].endsAt = Date.now() - 1;
const collectedBefore = game.Items.count("sticky_fluid");
const report = game.Dungeon.completeIfReady();
assert(report && game.Items.count("sticky_fluid") === collectedBefore + 2);
assert(report.newItemIds.includes("sticky_fluid") && report.drops.some(drop => drop.itemId === "sticky_fluid" && drop.newDiscovery), "First-time drops are marked in the expedition result");
assert.strictEqual(game.Dungeon.completeIfReady(), null);
assert(game.SaveTransfer.parse(storage.get(game.SaveSystem.exportKey)).ok);
console.log("Monster material test passed: tables, per-kill rolls, failed exploration, untouched enemies, aggregation, seeded outcomes, crafting consumption and saved grants");

