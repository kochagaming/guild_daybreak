const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const storage = new Map();
const context = vm.createContext({ console, window: {}, Date, Math, Blob, localStorage: {
  getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)
} });
["data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "data/monsters.js", "data/dungeons.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/shop.js", "js/party.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/battle.js", "js/dungeon.js", "js/saveTransfer.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context));
const game = context.window;
const hero = game.Characters.get(require("./helpers").createCharacter(game, "効果テスト", "cleric", "human", "sacred").id);
hero.level = 20;
const zero = { hp: 0, attack: 0, defense: 0 };
const bow = game.Items.createInstance("wolf_fang_bow", { modifiers: zero });
assert.strictEqual(bow.qualityId, "fine"); assert.strictEqual(bow.locked, true);
assert(!game.Shop.buy(bow.templateId).ok);
const armor = game.Items.createInstance("golem_plate", { qualityId: "hefty", modifiers: zero });
assert.strictEqual(game.Items.effects(armor).defense, 18 + 16);
const feather = game.Items.createInstance("golem_plate", { qualityId: "featherlight", modifiers: zero });
assert.strictEqual(game.Items.effects(feather).defense, 5 + 4);
const staff = game.Items.createInstance("sentinel_staff", { modifiers: zero });
const beforeHealing = game.Characters.stats(hero).healingPower;
assert(game.Items.equip(hero.id, staff.id).ok);
assert(Math.abs(game.Characters.stats(hero).healingPower - beforeHealing * 1.35) < 1e-9);
assert(game.Items.unequip(hero.id, staff.id).ok);
assert.strictEqual(game.Characters.stats(hero).healingPower, beforeHealing);
assert(game.Items.equip(hero.id, bow.id).ok);
game.Party.toggle(hero.id);
game.Dungeon.start("meadow");
assert(game.GameState.data.expeditions[0].partySnapshot[0].specialEquipment.includes(bow.templateId));
const snapshot = JSON.parse(JSON.stringify(game.GameState.data.expeditions[0].partySnapshot));
assert(game.Items.equip(hero.id, staff.id).ok);
assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].specialEquipment[0], bow.templateId);
game.GameData.monsters.dummy = { id: "dummy", name: "試験敵", hp: 99999, attack: 1, defense: 0, speed: 1 };
const dungeon = { name: "試験", encounters: [{ name: "一戦", groups: [["dummy", "dummy"]] }], rewards: { gold: [0, 0], exp: [0, 0] }, drops: [] };
snapshot[0].stats = { hp: 9999, attack: 10, defense: 999, speed: 99, criticalRate: 1 };
snapshot[0].skillIds = ["twin_strike"];
snapshot[0].actionRates = { attack: 100, technique: 0, spell: 0, healing: 0 };
// 通常攻撃の会心と、多段攻撃の会心を別々に検証。
for (const skillIds of [[], ["twin_strike"], ["arcane_burst"]]) {
  snapshot[0].skillIds = skillIds;
  const result = game.Battle.resolve({ seed: 123, partyIds: [], partySnapshot: snapshot }, dungeon);
  const followups = result.battleLog.filter(entry => entry.text.includes("牙の追撃"));
  const criticalRounds = new Set(result.battleLog.filter(entry => entry.text.includes("【会心】")).map(entry => entry.round));
  assert.strictEqual(followups.length, criticalRounds.size);
  assert(followups.length > 0 && followups.length <= 30);
  assert(followups.every(entry => !entry.text.includes("【会心】")));
}
game.GameData.monsters.dummy.attack = 50;
game.GameData.monsters.dummy.speed = 100;
snapshot[0].skillIds = ["heal"];
snapshot[0].actionRates = { attack: 0, technique: 0, spell: 0, healing: 100 };
snapshot[0].specialEquipment = ["sentinel_staff"];
snapshot[0].stats = { hp: 100, attack: 10, defense: 0, speed: 1, criticalRate: 0, healingPower: 1.35 };
const boosted = game.Battle.resolve({ seed: 123, partyIds: [], partySnapshot: snapshot }, { ...dungeon, encounters: [{ name: "一戦", groups: [["dummy"]] }] });
const firstHeal = boosted.battleLog.find(entry => entry.kind === "heal");
assert(firstHeal && firstHeal.text.includes("固有效果：星守りの祈杖"));
assert(firstHeal.text.includes(`+${Math.round((10 * 1.55 + 5) * 1.35)}`));
for (const id of ["meadow", "cave", "ruins"]) {
  const expedition = { seed: 123, partyIds: [], partySnapshot: [{ id: "test", name: "討伐者", level: 99, jobId: "warrior", position: 0, skillIds: [], stats: { hp: 99999, attack: 99999, defense: 99999, speed: 99, criticalRate: 0 } }] };
  const boss = Object.values(game.GameData.monsters).find(monster => monster.bossDrop && game.GameData.dungeons[id].encounters.some(encounter => encounter.groups.some(group => group.includes(monster.id))));
  boss.bossDrop.chance = 1;
  const result = game.Battle.resolve(expedition, game.GameData.dungeons[id]);
  assert(result.success && result.drops.some(drop => drop.itemId === boss.bossDrop.itemId));
  assert.strictEqual(JSON.stringify(result), JSON.stringify(game.Battle.resolve(expedition, game.GameData.dungeons[id])), "固定シードで同じ結果を返すこと");
  expedition.partySnapshot[0].stats.hp = 1; expedition.partySnapshot[0].stats.attack = 0; expedition.partySnapshot[0].stats.defense = 0; expedition.partySnapshot[0].stats.speed = 0;
  assert(!game.Battle.resolve(expedition, game.GameData.dungeons[id]).drops.some(drop => drop.itemId === boss.bossDrop.itemId));
}
{ const parsed = game.SaveTransfer.parse(JSON.stringify(game.GameState.data)); assert(parsed.ok, parsed.message); }
console.log("Boss loot test passed: unique sources, fixed quality/lock, weight defense, healing scaling, snapshot isolation, bounded followups, seeded boss drops and backup validation");

