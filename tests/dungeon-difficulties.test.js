const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, setTimeout, clearTimeout, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !file.startsWith("js/ui") && !["js/main.js", "js/portraitPress.js", "js/recruitmentReveal.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window;

assert.deepStrictEqual(Array.from(game.DungeonDifficulty.ids()), ["normal", "abyss", "divine"]);
const base = game.GameData.dungeons.meadow;
const abyss = game.DungeonDifficulty.variant(base, "abyss");
const divine = game.DungeonDifficulty.variant(base, "divine");
assert.strictEqual(abyss.name, "魔境の風鳴りの草原");
assert.strictEqual(divine.name, "神域の風鳴りの草原");
assert.strictEqual(abyss.duration, Math.ceil(base.duration * 1.5));
assert.strictEqual(divine.duration, Math.ceil(base.duration * 2.5));
assert(abyss.rewards.gold[0] > base.rewards.gold[0] && divine.rewards.gold[0] > abyss.rewards.gold[0]);

assert(game.DungeonDifficulty.unlocked("meadow", "normal"));
assert(!game.DungeonDifficulty.unlocked("meadow", "abyss"));
game.GameState.data.story.facts.clears.push("meadow");
assert(game.DungeonDifficulty.unlocked("meadow", "abyss"));
assert(!game.DungeonDifficulty.unlocked("meadow", "divine"));
game.DungeonDifficulty.recordClear("meadow", "abyss");
assert(game.DungeonDifficulty.unlocked("meadow", "divine"));

const normalSlime = game.DungeonDifficulty.monster("slime", "normal");
const abyssSlime = game.DungeonDifficulty.monster("slime", "abyss");
const divineSlime = game.DungeonDifficulty.monster("slime", "divine");
assert.strictEqual(normalSlime.name, "スライム");
assert.strictEqual(abyssSlime.name, "魔境のスライム");
assert.strictEqual(divineSlime.name, "神域のスライム");
assert(abyssSlime.hp > normalSlime.hp && divineSlime.hp > abyssSlime.hp);
assert.deepStrictEqual(Array.from(abyssSlime.signatureDropTiers, entry => entry.difficultyId), ["normal", "abyss"]);
assert.deepStrictEqual(Array.from(divineSlime.signatureDropTiers, entry => entry.difficultyId), ["normal", "abyss", "divine"]);
assert(divineSlime.signatureDropTiers.some(entry => entry.drops.materials.some(drop => drop.itemId === "divine_slime_core")));
assert(game.Encyclopedia.itemSources("divine_slime_core").includes("神域のスライム"));
assert.deepStrictEqual(Array.from(abyssSlime.difficultySkillIds), ["viscous_wave"]);
assert.deepStrictEqual(Array.from(divineSlime.difficultySkillIds), ["viscous_wave", "divine_mitosis"]);
assert(game.GameData.monsterDifficultyProfiles.blackmoon_priest.abyss.skillIds.includes("memory_seal"));

Object.values(game.GameData.monsters).forEach(monster => {
  const profile = game.GameData.monsterDifficultyProfiles[monster.id];
  ["abyss", "divine"].forEach(id => {
    assert(profile[id] && Array.isArray(profile[id].skillIds) && profile[id].combatOverrides, `${monster.id}:${id} needs an extensible titled profile`);
    assert(profile[id].signatureDrops.materials.length && profile[id].signatureDrops.equipment, `${monster.id}:${id} needs fixed titled drops`);
  });
});

game.GameState.data.characters.push({ id: "hero", name: "試験者", level: 1, exp: 0, raceId: "human", jobId: "warrior", birthId: "common", portraitId: "legacy_01", equipment: [], career: null, actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, base: { hp: 9999, attack: 999, defense: 99 } });
game.GameState.data.parties[0] = ["hero"];
const started = game.Dungeon.start("meadow", 0, 2, "abyss");
assert(started.ok);
assert.strictEqual(game.GameState.data.expeditions[0].difficultyId, "abyss");
assert.strictEqual(game.GameState.data.expeditions[0].endsAt - game.GameState.data.expeditions[0].startedAt, abyss.duration * 2 * 1000);

const slimeHp = game.GameData.monsters.slime.hp, slimeAttack = game.GameData.monsters.slime.attack;
game.GameData.monsters.slime.hp = 9999; game.GameData.monsters.slime.attack = 5;
const skillResult = game.Battle.resolve({ seed: 17, timeMultiplier: 1, partyIds: [], partySnapshot: [{
  id: "observer", name: "観測役", level: 1, jobId: "warrior", raceId: "human", position: 0, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 },
  stats: { hp: 9999, attack: 1, defense: 100, magicAttack: 1, magicDefense: 100, magicHealing: 1, speed: 10, hitRate: .99, evasionRate: 0, attackCount: 1, criticalRate: 0 }
}] }, { id: "skill-test", name: "称号技試験", shortName: "試験", duration: 30, difficulty: 1, difficultyId: "abyss", encounters: [{ name: "粘液観測", groups: [["slime"]] }], rewards: { gold: [0, 0], exp: [0, 0] }, drops: [] });
game.GameData.monsters.slime.hp = slimeHp; game.GameData.monsters.slime.attack = slimeAttack;
assert(skillResult.battleLog.some(entry => entry.kind === "enemy-skill" && entry.text.includes("粘液波") && entry.text.includes("3ターン周期")), "Titled monster skill appears in the battle log on its configured cycle");

console.log("Dungeon difficulty test passed: progression, names, time/reward/stat scaling, inherited titled drops and data-driven titled monster skills");
