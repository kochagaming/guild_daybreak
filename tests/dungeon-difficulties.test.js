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
assert(game.GameData.dungeonDifficulties.abyss.chapterMapDialogue?.receptionist && game.GameData.dungeonDifficulties.abyss.chapterMapDialogue?.adventurer && game.GameData.dungeonDifficulties.abyss.chapterMapDialogue?.archivist, "Abyss chapter completion has a data-driven three-person return conversation");
assert(game.GameData.dungeonDifficulties.divine.chapterMapDialogue?.title && game.GameData.dungeonDifficulties.divine.chapterMapDialogue.archivist.includes("巡礼図"), "Divine chapter completion has its own pilgrimage-map conversation");
assert.strictEqual(game.GameData.dungeonDifficulties.abyss.chapterMapBenefit.explorationTimeMultiplier, .95, "A completed abyss chapter map provides a modest repeat-exploration benefit");
assert.strictEqual(game.GameData.dungeonDifficulties.divine.chapterMapBenefit.explorationTimeMultiplier, .9, "A completed divine chapter map provides a stronger repeat-exploration benefit");
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
const openProgress = game.DungeonDifficulty.progress(["meadow", "cave"]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(openProgress.slice(1))), [
  { difficultyId: "abyss", name: "魔境", completed: 0, total: 1, complete: false },
  { difficultyId: "divine", name: "神域", completed: 0, total: 0, complete: false }
], "Difficulty progress counts only routes that have cleared the preceding tier");
const nextAbyss = game.DungeonDifficulty.nextAfterResult({ success: true, dungeonId: "meadow", difficultyId: "normal" });
assert(nextAbyss && nextAbyss.difficultyId === "abyss" && nextAbyss.name === "魔境の風鳴りの草原", "A successful normal clear points to the newly unlocked abyss tier");
const nextUnclearedAbyss = game.DungeonDifficulty.nextUncleared(["meadow", "cave"], "abyss");
assert(nextUnclearedAbyss && nextUnclearedAbyss.baseDungeonId === "meadow", "The difficulty ledger can resolve its next eligible uncleared route");
assert.strictEqual(game.DungeonDifficulty.nextUncleared(["cave"], "abyss"), null, "Locked routes are not advertised as the next hard-mode destination");
assert.strictEqual(game.DungeonDifficulty.nextAfterResult({ success: false, dungeonId: "meadow", difficultyId: "normal" }), null, "A failed expedition never advertises a harder tier");
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
assert(game.GameData.relations.monsterDifficultySkillGrants.blackmoon_priest.abyss.includes("memory_seal"));

Object.values(game.GameData.monsters).forEach(monster => {
  const drops = game.GameData.derived.monsterDifficultyDrops[monster.id];
  ["abyss", "divine"].forEach(id => {
    assert(drops[id]?.materials.length && drops[id].equipment, `${monster.id}:${id} needs resolved titled drops`);
  });
});

game.GameState.data.characters.push({ id: "hero", name: "試験者", level: 1, exp: 0, raceId: "human", jobId: "warrior", birthId: "common", portraitId: "legacy_01", equipment: [], career: null, actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, attributes: { vitality: 999, strength: 999, fortitude: 999, intelligence: 999, spirit: 999, dexterity: 999, agility: 999, luck: 999 }, source: { type: "recruitment" } });
game.GameState.data.parties[0] = ["hero"];
const started = game.Dungeon.start("meadow", 0, 2, "abyss");
assert(started.ok);
assert.strictEqual(game.GameState.data.expeditions[0].difficultyId, "abyss");
assert.strictEqual(game.GameState.data.expeditions[0].endsAt - game.GameState.data.expeditions[0].startedAt, abyss.duration * 2 * 1000);
const sealsBefore = game.Items.count("guild_seal");
const firstClearResult = game.Dungeon.completeIfReady(game.GameState.data.expeditions[0].endsAt);
assert(firstClearResult.success && firstClearResult.firstClearReward, "First hard-mode clear grants a separate reward");
assert(firstClearResult.newAchievementIds.includes("abyss_threshold"), "The first abyss victory is celebrated as the opening hard-mode milestone");
assert(firstClearResult.newObservationIds.includes("abyss_spoils"), "The first abyss victory reveals its titled-monster field note");
assert.strictEqual(game.Items.count("guild_seal"), sealsBefore + 1 + (firstClearResult.rumorConfirmationReward?.quantity || 0) + (firstClearResult.monsterHuntSealReward || 0) + (firstClearResult.newMonsterHabitatSurvey?.sealReward || 0));
const sealsAfterFirstClear = game.Items.count("guild_seal");
assert(game.DungeonDifficulty.cleared("meadow", "abyss") && game.DungeonDifficulty.unlocked("meadow", "divine"));
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.DungeonDifficulty.progress(["meadow"]).slice(1))), [
  { difficultyId: "abyss", name: "魔境", completed: 1, total: 1, complete: true },
  { difficultyId: "divine", name: "神域", completed: 0, total: 1, complete: false }
], "Clearing abyss completes its ledger row and opens the same route in the divine row");
const nextDivine = game.DungeonDifficulty.nextAfterResult(firstClearResult);
assert(nextDivine && nextDivine.difficultyId === "divine" && nextDivine.name === "神域の風鳴りの草原", "A successful abyss clear points to the newly unlocked divine tier");
const roadsideRoutes = Object.values(game.GameData.dungeons).filter(dungeon => dungeon.chapterId === "roadside" && dungeon.requiredForStory).sort((left, right) => left.orderInChapter - right.orderInChapter);
const chapterProgressState = JSON.parse(JSON.stringify(game.GameState.data));
roadsideRoutes.forEach(dungeon => { if (!chapterProgressState.story.facts.clears.includes(dungeon.id)) chapterProgressState.story.facts.clears.push(dungeon.id); });
const nextAbyssRoute = game.DungeonDifficulty.nextChapterRouteAfterResult(firstClearResult, chapterProgressState);
assert(nextAbyssRoute && nextAbyssRoute.baseDungeonId === "whispering_brook" && nextAbyssRoute.difficultyId === "abyss" && nextAbyssRoute.completed === 1 && nextAbyssRoute.total === 5 && nextAbyssRoute.remaining === 4, "A hard-mode victory points to the next uncleared route in the same chapter map");
assert.strictEqual(game.DungeonDifficulty.nextUncleared(["meadow"], "abyss"), null, "A completed tier has no remaining destination");
assert.strictEqual(game.DungeonDifficulty.nextUncleared(["meadow"], "divine").baseDungeonId, "meadow", "The ledger advances the same route to divine once abyss is cleared");
assert.strictEqual(game.DungeonDifficulty.nextAfterResult({ success: true, dungeonId: "meadow", difficultyId: "divine" }), null, "The highest tier has no follow-up difficulty");
assert(game.Dungeon.start("meadow", 0, 1, "abyss").ok);
const repeatResult = game.Dungeon.completeIfReady(game.GameState.data.expeditions[0].endsAt);
assert(repeatResult.success && !repeatResult.firstClearReward, "Repeat clears do not grant the one-time reward again");
assert.strictEqual(game.Items.count("guild_seal"), sealsAfterFirstClear + (repeatResult.rumorConfirmationReward?.quantity || 0) + (repeatResult.monsterHuntSealReward || 0) + (repeatResult.newMonsterHabitatSurvey?.sealReward || 0));

game.GameState.data.story.readSceneIds = Object.keys(game.GameData.storyScenes);
roadsideRoutes.forEach(dungeon => {
  if (!game.GameState.data.story.facts.clears.includes(dungeon.id)) game.GameState.data.story.facts.clears.push(dungeon.id);
});
const finalRoadsideRoute = roadsideRoutes[roadsideRoutes.length - 1];
roadsideRoutes.slice(0, -1).forEach(dungeon => {
  const key = `${dungeon.id}:abyss`;
  if (!game.GameState.data.story.facts.difficultyClears.includes(key)) game.GameState.data.story.facts.difficultyClears.push(key);
});
assert(game.Dungeon.start(finalRoadsideRoute.id, 0, 1, "abyss").ok, "The final open route in a hard-mode chapter can be started");
const chapterMapResult = game.Dungeon.completeIfReady(game.GameState.data.expeditions[0].endsAt);
assert(chapterMapResult.success && chapterMapResult.difficultyChapterCompletion, "Clearing the last hard-mode route celebrates completion of its chapter map");
assert.deepStrictEqual(JSON.parse(JSON.stringify(chapterMapResult.difficultyChapterCompletion)), {
  chapterId: "roadside", chapterTitle: "第1章：街道の異変", difficultyId: "abyss", difficultyName: "魔境", totalRoutes: 5, completedChapters: 1
});
assert.strictEqual(game.GameState.data.partyHistory[0][0].difficultyChapterCompletion.chapterId, "roadside", "The completed chapter map remains readable in expedition history");
assert(chapterMapResult.newAchievementIds.includes("abyss_chapter_map"), "The chapter-map celebration and its first long-term milestone are resolved on the same return");
assert(chapterMapResult.newObservationIds.includes("abyss_atlas_complete"), "The return that completes a hard-mode chapter map also reveals its narrative diary page");
const mapBenefit = game.DungeonDifficulty.chapterMapBenefit(finalRoadsideRoute, "abyss");
assert.deepStrictEqual(JSON.parse(JSON.stringify(mapBenefit)), {
  chapterId: "roadside", difficultyId: "abyss", difficultyName: "魔境", label: "赤糸の道案内", explorationTimeMultiplier: .95, reductionPercent: 5
}, "A completed chapter map resolves a reusable, data-driven navigation benefit");
assert.strictEqual(game.DungeonDifficulty.chapterMapBenefit(finalRoadsideRoute, "divine"), null, "An incomplete difficulty does not borrow another tier's completed map");
assert(game.Dungeon.start(finalRoadsideRoute.id, 0, 1, "abyss").ok, "The completed map can guide a repeat expedition");
const guidedExpedition = game.GameState.data.expeditions[0];
assert.strictEqual(guidedExpedition.endsAt - guidedExpedition.startedAt, Math.round(game.DungeonDifficulty.variant(finalRoadsideRoute, "abyss").duration * .95 * 1000), "The atlas benefit shortens repeat exploration in its own chapter and difficulty");
assert.strictEqual(guidedExpedition.acquisitionBonuses.explorationTime.multiplier, .95, "The atlas benefit composes through the existing exploration-time modifier pipeline");
assert.deepStrictEqual(JSON.parse(JSON.stringify(guidedExpedition.chapterMapBenefit)), { label: "赤糸の道案内", explorationTimeMultiplier: .95, reductionPercent: 5 }, "Departure snapshots the exact map guidance that affected its duration");
const guidedResult = game.Dungeon.completeIfReady(guidedExpedition.endsAt);
assert(guidedResult.chapterMapBenefit && guidedResult.chapterMapBenefit.secondsSaved > 0, "The return report preserves how many seconds the chapter map saved");
assert(guidedResult.battleLog.some(entry => entry.kind === "formation" && entry.text.includes("【赤糸の道案内】") && entry.text.includes("探索時間を5%短縮")), "A map-guided expedition explains the inherited route knowledge in its live journey log");
assert.strictEqual(game.GameState.data.partyHistory[0][0].chapterMapBenefit.secondsSaved, guidedResult.chapterMapBenefit.secondsSaved, "The time saved by map guidance remains visible in expedition history");

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
