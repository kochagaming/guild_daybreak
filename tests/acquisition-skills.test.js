const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, Date, Math, Blob, console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;

const bonuses = game.AcquisitionSkills.resolve([
  { id: "a", skillIds: ["birth_merchant_foresight", "birth_scholar_theory", "race_halfling_luck", "job_ranger_eagle_eye", "birth_frontier_grit", "job_bard_resonance"] },
  { id: "b", skillIds: ["birth_merchant_foresight", "birth_scholar_theory", "race_halfling_luck", "job_ranger_eagle_eye", "birth_frontier_grit", "job_bard_resonance"] }
]);
const breakdown = game.AcquisitionSkills.breakdown([
  { id: "a", skillIds: ["birth_merchant_foresight", "birth_scholar_theory"] },
  { id: "b", skillIds: ["birth_merchant_foresight", "birth_scholar_theory"] }
]);
const merchantEntry = breakdown.entries.find(entry => entry.skillId === "birth_merchant_foresight");
const scholarEntries = breakdown.entries.filter(entry => entry.skillId === "birth_scholar_theory");
assert.strictEqual(merchantEntry.scope, "party");
assert.deepStrictEqual(Array.from(merchantEntry.ownerIds), ["a", "b"], "A party-unique entry retains every owner for UI explanation");
assert.strictEqual(scholarEntries.length, 2, "Personal acquisition effects remain separate per owner in the UI breakdown");
assert.strictEqual(bonuses.gold.multiplier, 1.08, "The same party skill must not stack between members");
assert.strictEqual(bonuses.gold.flat, 5);
assert.strictEqual(bonuses.qualityRate.multiplier, 1.5);
assert.strictEqual(bonuses.itemRate.multiplier, 1.12);
assert.strictEqual(bonuses.explorationTime.multiplier, .9);
assert.strictEqual(bonuses.experience.party.multiplier, 1.06);
assert.strictEqual(bonuses.experience.members.a.multiplier, 1.12, "Personal XP applies to its owner");
assert.strictEqual(bonuses.experience.members.b.multiplier, 1.12, "The same personal skill applies independently to another owner");
assert.strictEqual(game.AcquisitionSkills.amount(100, bonuses.gold), 113);
assert.strictEqual(game.AcquisitionSkills.partyExperience(100, bonuses), 106);
assert.strictEqual(game.AcquisitionSkills.memberExperience(106, "a", bonuses), 118);
assert.strictEqual(game.AcquisitionSkills.durationMs(30, 2, bonuses), 54000);
assert.strictEqual(game.AcquisitionSkills.chance(.1, bonuses.itemRate), .11200000000000002);

const values = (...entries) => { let index = 0; return () => entries[index++] ?? .5; };
const plain = game.Items.createInstance("wooden_sword", { source: "drop", random: values(.6, .5), modifiers: {} });
const qualityBoosted = game.Items.createInstance("wooden_sword", { source: "drop", random: values(.6, .5), modifiers: {}, qualityRateMultiplier: 1.5 });
assert.strictEqual(plain.qualityId, "standard");
assert(
  game.GameData.qualities[qualityBoosted.qualityId].rank > game.GameData.qualities[plain.qualityId].rank,
  "Quality-rate bonus should shift the same roll into a higher quality rank"
);
assert.strictEqual(plain.ultraRareTitleId, null);
assert.strictEqual(qualityBoosted.ultraRareTitleId, null, "Quality rate must not alter ultra-rare title chance");

const member = {
  id: "hero", name: "試験者", level: 1, jobId: "warrior", raceId: "human", position: 0,
  actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], specialEquipment: [],
  stats: { hp: 99999, attack: 99999, defense: 9999, magicAttack: 1, magicDefense: 9999, magicHealing: 1, hitRate: 1.2, evasionRate: 0, speed: 99, attackCount: 1, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1, slayerMultipliers: {} }
};
const expedition = { seed: 91, timeMultiplier: 1, partyIds: [member.id], partySnapshot: [member] };
const base = game.Battle.resolve(expedition, game.GameData.dungeons.meadow);
const boosted = game.Battle.resolve({ ...expedition, acquisitionBonuses: bonuses }, game.GameData.dungeons.meadow);
assert(boosted.gold >= Math.floor(base.gold * 1.08) + 5);
assert.strictEqual(boosted.exp, Math.floor(base.exp * 1.06));

console.log("Acquisition skills test passed: party-unique stacking, personal/party XP, gold, item/quality rates and snapshotted exploration time");
