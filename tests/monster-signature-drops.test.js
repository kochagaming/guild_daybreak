const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window;

Object.values(game.GameData.monsters).forEach(monster => {
  const signature = game.GameData.relations.monsterSignatureDrops[monster.id];
  assert(signature.materials.length >= 1, `${monster.id} needs material signature`);
  assert(signature.equipment?.itemId, `${monster.id} needs equipment signature`);
  assert(!Object.prototype.hasOwnProperty.call(monster, "signatureDrops"), `${monster.id} must not mix drop relations into its combat record`);
});
assert.strictEqual(game.GameData.items.sticky_fluid.name, "ねばねばした液体");
assert.strictEqual(game.GameData.items.tattered_cloth.name, "ぼろぼろの布切れ");
assert.strictEqual(game.GameData.relations.monsterSignatureDrops.slime.equipment.itemId, "slimecloth_mantle");
assert(!game.Shop.buy("slimecloth_mantle").ok, "Monster-only equipment must not appear as purchasable shop stock");

const slime = game.GameData.monsters.slime;
const slimeSignature = game.GameData.relations.monsterSignatureDrops.slime;
game.MonsterLoot.materialDrops(slime).forEach(drop => { drop.chance = 0; });
slimeSignature.materials.forEach(drop => { drop.chance = 1; });
slimeSignature.equipment.chance = 1;
game.GameData.config.monsterLoot.normalChance = 0;
const dungeon = { id: "signature_test", name: "固有戦利品試験", shortName: "試験", recommendedLevel: 1, duration: 1, color: "green", rewards: { gold: [0, 0], exp: [3, 3] }, drops: [], encounters: [{ name: "試験区画", groups: [["slime"]] }] };
const outcome = game.Battle.resolve({ seed: 128, timeMultiplier: 1, partySnapshot: [{ id: "hero", name: "試験者", level: 1, jobId: "warrior", raceId: "human", position: 0, actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], specialEquipment: [], stats: { hp: 100, attack: 999, defense: 20, magicAttack: 1, magicDefense: 20, magicHealing: 1, hitRate: 1.2, evasionRate: 0, speed: 99, attackCount: 1, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1, slayerMultipliers: {} } }] }, dungeon);
const ids = outcome.drops.map(drop => drop.itemId);
assert(ids.includes("sticky_fluid") && ids.includes("tattered_cloth") && ids.includes("slimecloth_mantle"));
assert(outcome.battleLog.some(entry => entry.text.includes("【固有素材】スライム")));
assert(outcome.battleLog.some(entry => entry.text.includes("【固有装備】スライム")));
assert(game.Encyclopedia.itemSources("slimecloth_mantle").includes("スライム"));
console.log("Monster signature drop test passed: every monster has fixed low-rate materials/equipment, slime examples, battle logs, codex sources and shop exclusion");
