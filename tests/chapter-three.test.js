const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const storage = new Map();
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, localStorage: {
    getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)
  } });
  ["data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/characterGrowth.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "data/monsters.js", "data/dungeons.js", "data/recipes.js", "data/story.js", "data/chapters/chapter4.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/shop.js", "js/party.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/battle.js", "js/dungeon.js", "js/blacksmith.js", "js/story.js", "js/saveTransfer.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context));
  return context.window;
}
let game = load();
const state = game.GameState.data;
assert.strictEqual(game.GameData.storyChapters.length, 5);
assert(!game.Story.canEnter("observatory") && !game.Story.canEnter("missing"));
assert(!game.Dungeon.start("observatory").ok);
assert(!game.Blacksmith.craft("forge_starsteel_sword").ok);
const heroes = ["warrior", "cleric", "mage"].map((job, index) => {
  const hero = game.Characters.get(require("./helpers").createCharacter(game, `塔の仲間${index}`, job).id);
  hero.level = 11;
  const weapon = game.Items.add(index === 0 ? "steel_sword" : "arcane_staff", 1, { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
  const armor = game.Items.add(index === 0 ? "iron_armor" : "leather_armor", 1, { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
  const weaponResult = game.Items.equip(hero.id, weapon.id), armorResult = game.Items.equip(hero.id, armor.id);
  assert(weaponResult.ok && armorResult.ok, `${job} Lv.${hero.level}: ${weaponResult.message} / ${armorResult.message}; ${game.Characters.equipmentWeight(hero)}/${game.Characters.maxWeight(hero)}`);
  game.Party.toggle(hero.id);
  if (index === 0) game.Characters.setActionRates(hero.id, { attack: 100, technique: 100, spell: 0, healing: 0 });
  if (index === 1) game.Characters.setActionRates(hero.id, { attack: 100, technique: 0, spell: 0, healing: 100 });
  if (index === 2) game.Characters.setActionRates(hero.id, { attack: 100, technique: 0, spell: 100, healing: 0 });
  return hero;
});
game.Story.recordDeparture("meadow");
game.Story.recordResult({ success: true, dungeonId: "meadow" });
game.Story.recordResult({ success: true, dungeonId: "cave" });
assert.strictEqual(game.Story.current().id, "starfall");
game.Story.recordResult({ success: false, dungeonId: "ruins" });
assert(!game.Story.canEnter("observatory"));
assert(game.Dungeon.start("ruins").ok);
state.expeditions[0].partySnapshot.forEach(hero => { hero.stats.hp = 9999; hero.stats.attack = 9999; hero.stats.defense = 9999; });
game.GameState.save();
game = load(); // Offline completion also unlocks the chapter.
const gold = game.GameState.data.gold;
const result = game.Dungeon.completeIfReady(game.GameState.data.expeditions[0].endsAt);
assert(result.success && result.storyCompleted.includes("starfall"));
assert.strictEqual(game.GameState.data.gold, gold + result.gold + 400);
assert(game.Story.canEnter("observatory"));
assert.strictEqual(game.Story.current().id, "ember_crown");
assert.strictEqual(game.Story.sync().length, 0);
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
const invalid = JSON.parse(JSON.stringify(game.GameState.data));
invalid.story.facts.clears = invalid.story.facts.clears.filter(id => id !== "ruins");
assert(!game.SaveTransfer.parse(JSON.stringify(invalid)).ok);
assert(game.Dungeon.start("observatory").ok);
const expedition = game.GameState.data.expeditions[0];
assert.strictEqual(expedition.endsAt - expedition.startedAt, 180000);
let wins = 0;
for (let seed = 1; seed <= 200; seed++) {
  const report = game.Battle.resolve({ ...expedition, seed }, game.GameData.dungeons.observatory);
  if (report.success) wins++;
}
console.log(`Observatory balance: level 11, standard tier 3/2 equipment, healer support: ${wins / 2}%`);
assert(wins >= 30 && wins <= 190, "Prepared level 11 fixture should have a meaningful but not guaranteed chance.");
const rushParty = expedition.partySnapshot.map(member => ({ ...member, actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 } }));
let rushWins = 0;
for (let seed = 1; seed <= 200; seed++) if (game.Battle.resolve({ ...expedition, partySnapshot: rushParty, seed }, game.GameData.dungeons.observatory).success) rushWins++;
assert(rushWins < wins, "Defensive preparation and reliable healing must matter for this party.");
console.log(`Observatory all-aggressive policy: ${rushWins / 2}%`);
// The new craftable equipment must make the same matchup more reliable.
game.Party.members().forEach((hero, index) => {
  const item = game.Items.add(index === 0 ? "starsteel_sword" : "starwoven_robe", 1, { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
  const replacementType = game.GameData.items[item.templateId].type;
  const replacedId = hero.equipment.find(id => game.GameData.items[game.Items.getInstance(id).templateId].type === replacementType);
  if (replacedId) assert(game.Items.unequip(hero.id, replacedId).ok);
  assert(game.Items.equip(hero.id, item.id).ok);
});
const upgraded = expedition.partySnapshot.map(member => ({ ...member, stats: game.Characters.stats(game.Characters.get(member.id)) }));
let upgradedWins = 0;
for (let seed = 1; seed <= 200; seed++) if (game.Battle.resolve({ ...expedition, partySnapshot: upgraded, seed }, game.GameData.dungeons.observatory).success) upgradedWins++;
assert(upgradedWins > wins);
console.log(`Observatory upgraded equipment: ${upgradedWins / 2}%`);
expedition.partySnapshot.forEach(hero => { hero.stats.hp = 9999; hero.stats.attack = 9999; hero.stats.defense = 9999; });
game.GameData.monsters.storm_regent.bossDrop.chance = 1;
const report = game.Dungeon.completeIfReady(expedition.endsAt);
assert(report.success && report.totalEncounters === 4 && report.monstersDefeated === 7);
assert(report.battleLog.some(entry => entry.text.includes("嵐を纏う翼王")));
assert(game.Items.count("star_shard") >= 2);
assert(game.Items.count("tempest_bow") === 1);
assert(game.GameState.data.inventory.equipment.find(item => item.templateId === "tempest_bow").locked);
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
assert(!game.Shop.buy("tempest_bow").ok && !game.Shop.buy("starsteel_sword").ok);
for (const id of ["forge_starsteel_sword", "forge_starwoven_robe"]) {
  const recipe = game.GameData.recipes.find(recipe => recipe.id === id);
  assert(game.Story.canCraft(recipe));
  game.GameState.data.gold = 10000;
  Object.entries(recipe.materials).forEach(([itemId, quantity]) => { game.GameState.data.inventory.materials[itemId] = quantity; });
  const before = game.Items.count(recipe.resultId);
  assert(game.Blacksmith.craft(id).ok);
  assert.strictEqual(game.Items.count(recipe.resultId), before + 1);
  Object.keys(recipe.materials).forEach(itemId => assert.strictEqual(game.Items.count(itemId), 0));
  assert(!game.Blacksmith.craft(id).ok);
}
const earned = game.GameState.data.gold;
game.GameState.save(); game = load();
assert.strictEqual(game.Dungeon.completeIfReady(Date.now() + 999999), null);
assert.strictEqual(game.GameState.data.gold, earned);
game.GameState.reset();
assert(!game.Story.canEnter("ruins") && !game.Story.canEnter("observatory"));
console.log("Chapter three test passed: progression, offline unlock/rewards once, tower battles/materials/boss gear, crafting, backups");

