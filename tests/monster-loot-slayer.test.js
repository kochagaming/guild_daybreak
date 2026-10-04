const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window;

assert.deepStrictEqual(Array.from(game.CreatureFamilies.familyIdsForRace("dragonewt")), ["humanoid", "dragon"]);
assert(game.CreatureFamilies.familyIdsForMonster("elder_ash_dragon").includes("dragon"));
assert(game.CreatureFamilies.familyIdsForMonster("skeleton").includes("undead"));

const meadowWolf = game.MonsterLoot.candidates(game.GameData.dungeons.meadow, game.GameData.monsters.grass_wolf);
assert(meadowWolf.weapons.length && meadowWolf.weapons.every(item => ["bow", "katana"].includes(item.weaponType)));
assert(meadowWolf.armor.every(item => ["leather", "gauntlet"].includes(item.armorType)));
const caveGolem = game.MonsterLoot.candidates(game.GameData.dungeons.cave, game.GameData.monsters.stone_golem);
assert(caveGolem.pool.every(item => item.tier === 2), "Dungeon difficulty should select tier 2 common gear");
assert(caveGolem.weapons.every(item => ["sword", "staff"].includes(item.weaponType)));
assert(caveGolem.armor.every(item => ["heavy", "shield", "gauntlet"].includes(item.armorType)));
const ruinsUndead = game.MonsterLoot.candidates(game.GameData.dungeons.ruins, game.GameData.monsters.skeleton);
assert(ruinsUndead.pool.every(item => item.tier === 3), "Harder dungeons should select stronger common gear");
assert(ruinsUndead.weapons.every(item => ["sword", "rapier", "staff"].includes(item.weaponType)));

const originalChance = game.GameData.config.monsterLoot.normalChance;
game.GameData.config.monsterLoot.normalChance = 1;
const wolfDrop = game.MonsterLoot.roll(() => .01, game.GameData.dungeons.meadow, game.GameData.monsters.grass_wolf);
assert(wolfDrop && game.GameData.items[wolfDrop.itemId] && !game.GameData.items[wolfDrop.itemId].unique);
game.GameData.monsters.loot_dummy = { id: "loot_dummy", name: "戦利品試験獣", hp: 1, attack: 0, defense: 0, speed: 1, hitRate: .1, evasionRate: 0 };
game.GameData.registry.relations("monsterFamilies", { loot_dummy: ["beast"] });
const battleDungeon = { id: "loot_test", name: "戦利品試験", shortName: "試験", recommendedLevel: 1, duration: 1, color: "green", rewards: { gold: [0, 0], exp: [3, 3] }, drops: [], encounters: [{ name: "試験区画", groups: [["loot_dummy"]] }] };
const outcome = game.Battle.resolve({ seed: 777, timeMultiplier: 1, partySnapshot: [{ id: "hero", name: "試験者", level: 1, jobId: "warrior", raceId: "human", position: 0, actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], specialEquipment: [], stats: { hp: 100, attack: 999, defense: 20, magicAttack: 1, magicDefense: 20, magicHealing: 1, hitRate: 1.2, evasionRate: 0, speed: 99, attackCount: 1, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1, slayerMultipliers: {} } }] }, battleDungeon);
const monsterDrop = outcome.drops.find(drop => ["weapon", "armor"].includes(game.GameData.items[drop.itemId]?.type));
assert(monsterDrop, "A defeated monster should execute its equipment roll");
const droppedItem = game.GameData.items[monsterDrop.itemId];
assert(droppedItem.type === "weapon" ? ["bow", "katana"].includes(droppedItem.weaponType) : ["leather", "gauntlet"].includes(droppedItem.armorType));
assert(outcome.battleLog.some(entry => entry.text.includes("【装備ドロップ】戦利品試験獣")));
game.GameData.config.monsterLoot.normalChance = originalChance;

const nodachi = { id: "test-nodachi", templateId: "dragon_nodachi", qualityId: "standard", modifiers: {}, upgradeLevel: 0 };
const gear = game.EquipmentSkills.aggregate([nodachi]);
assert.strictEqual(gear.slayers.dragon, 1.1);
const dragonWard = { currentHp: 1, skillIds: ["birth_dragon_warding"] };
assert.strictEqual(game.SkillCombat.slayerMultiplier(dragonWard, { familyIds: ["dragon"] }), 1.1);
assert.strictEqual(game.SkillCombat.slayerMultiplier(dragonWard, { familyIds: ["undead"] }), 1);
const celestial = { currentHp: 1, skillIds: ["race_celestial_grace"] };
assert.strictEqual(game.SkillCombat.slayerMultiplier(celestial, { familyIds: ["undead"] }), 1.2);

const planned = game.Exploration.plan(game.GameData.dungeons.meadow, 6);
assert(planned.equipmentDropRate < 1 && planned.equipmentDropRate > 0, "Long expeditions should gain drops but remain less efficient than repeated short expeditions");
console.log("Monster loot/slayer test passed: shared families, difficulty tiers, family weapon profiles, per-monster rolls and stacking slayer effects");
