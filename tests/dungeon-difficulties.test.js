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
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.DungeonDifficulty.firstClearReward("abyss"))), { gold: 0, materials: { guild_seal: 1 } });
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.DungeonDifficulty.firstClearReward("divine"))), { gold: 0, materials: { guild_seal: 2 } });

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
const sealsBefore = game.Items.count("guild_seal");
const firstClearResult = game.Dungeon.completeIfReady(game.GameState.data.expeditions[0].endsAt);
assert(firstClearResult.success && firstClearResult.firstClearReward, "First hard-mode clear grants a separate reward");
assert.strictEqual(game.Items.count("guild_seal"), sealsBefore + 1);
assert(game.DungeonDifficulty.cleared("meadow", "abyss") && game.DungeonDifficulty.unlocked("meadow", "divine"));
assert(game.Dungeon.start("meadow", 0, 1, "abyss").ok);
const repeatResult = game.Dungeon.completeIfReady(game.GameState.data.expeditions[0].endsAt);
assert(repeatResult.success && !repeatResult.firstClearReward, "Repeat clears do not grant the one-time reward again");
assert.strictEqual(game.Items.count("guild_seal"), sealsBefore + 1);

const slimeHp = game.GameData.monsters.slime.hp, slimeAttack = game.GameData.monsters.slime.attack;
game.GameData.monsters.slime.hp = 9999; game.GameData.monsters.slime.attack = 5;
const skillResult = game.Battle.resolve({ seed: 17, timeMultiplier: 1, partyIds: [], partySnapshot: [{
  id: "observer", name: "観測役", level: 1, jobId: "warrior", raceId: "human", position: 0, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 },
  stats: { hp: 9999, attack: 1, defense: 100, magicAttack: 1, magicDefense: 100, magicHealing: 1, speed: 10, hitRate: .99, evasionRate: 0, attackCount: 1, criticalRate: 0 }
}] }, { id: "skill-test", name: "称号技試験", shortName: "試験", duration: 30, difficulty: 1, difficultyId: "abyss", encounters: [{ name: "粘液観測", groups: [["slime"]] }], rewards: { gold: [0, 0], exp: [0, 0] }, drops: [] });
game.GameData.monsters.slime.hp = slimeHp; game.GameData.monsters.slime.attack = slimeAttack;
assert(skillResult.battleLog.some(entry => entry.kind === "enemy-skill" && entry.text.includes("粘液波") && entry.text.includes("3ターン周期")), "Titled monster skill appears in the battle log on its configured cycle");
assert.deepStrictEqual(Array.from(skillResult.monsterObservations.slime.difficultySkillIds), ["viscous_wave"], "Only skills actually used in battle become observations");
game.Encyclopedia.recordBattle(skillResult.monsterEncounters, {}, skillResult.monsterObservations, "abyss");
assert.deepStrictEqual(Array.from(game.Encyclopedia.monster("slime").difficulties.abyss.skillIds), ["viscous_wave"], "Observed titled skills remain known even when the party does not defeat the monster");

const chapterBossSkills = {
  moonfang_alpha: "moonfang_howl", earth_oracle: "earthpulse_overload", astral_archon: "orbit_execution",
  cinder_sovereign: "cinder_coronation", mirror_queen: "mirror_refraction", time_queen: "stolen_hour",
  nightbloom_oracle: "nightbloom_spores", aurora_warden: "aurora_prism", eclipse_regent: "eclipse_decree", blackmoon_heart: "memory_eclipse"
};
const chapterBossDivineSkills = {
  moonfang_alpha: "divine_pack_eclipse", earth_oracle: "divine_fault", astral_archon: "celestial_verdict",
  cinder_sovereign: "divine_ashfall", mirror_queen: "divine_tidal_mirror", time_queen: "divine_time_sentence",
  nightbloom_oracle: "divine_nightbloom", aurora_warden: "divine_whiteout", eclipse_regent: "divine_eclipse", blackmoon_heart: "divine_blackmoon_memory"
};
for (const [monsterId, skillId] of Object.entries(chapterBossSkills)) {
  assert(game.DungeonDifficulty.monster(monsterId, "abyss").difficultySkillIds.includes(skillId), `${monsterId} has its abyss skill`);
  assert(game.DungeonDifficulty.monster(monsterId, "divine").difficultySkillIds.includes(skillId), `${monsterId} passes its abyss skill to the divine tier`);
  assert(game.DungeonDifficulty.monster(monsterId, "divine").difficultySkillIds.includes(chapterBossDivineSkills[monsterId]), `${monsterId} has its divine-exclusive skill`);
}
const archon = game.GameData.monsters.astral_archon;
const archonAttack = archon.attack;
archon.attack = 1;
const archonResult = game.Battle.resolve({ seed: 81, timeMultiplier: 1, partyIds: [], partySnapshot: [{
  id: "archon-observer", name: "星環観測役", level: 1, jobId: "warrior", raceId: "human", position: 0, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 },
  stats: { hp: 99999, attack: 1, defense: 9999, magicAttack: 1, magicDefense: 9999, magicHealing: 1, speed: 10, hitRate: .99, evasionRate: 0, attackCount: 1, criticalRate: 0 }
}] }, { id: "archon-skill-test", name: "星環技試験", shortName: "星環試験", duration: 30, difficulty: 1, difficultyId: "divine", encounters: [{ name: "執政者観測", groups: [["astral_archon"]] }], rewards: { gold: [0, 0], exp: [0, 0] }, drops: [] });
archon.attack = archonAttack;
assert(archonResult.battleLog.some(entry => entry.kind === "enemy-skill" && entry.text.includes("星環執行") && entry.text.includes("5ターン周期")), "A chapter boss can use its titled skill alongside its telegraphed mechanic");
assert(archonResult.battleLog.some(entry => entry.kind === "enemy-skill" && entry.text.includes("天環審判") && entry.text.includes("5ターン周期")), "A divine chapter boss alternates between ready skills that share the same cycle");

console.log("Dungeon difficulty test passed: progression, names, scaling, first-clear rewards, inherited drops and alternating divine boss skills");
