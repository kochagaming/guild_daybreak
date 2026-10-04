const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1])
  .filter(file => !["js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window, state = game.GameState.data;

const companionIds = Object.keys(game.GameData.companions);
assert.strictEqual(game.GameData.config.companions.rosterLimit, 8);
assert.strictEqual(companionIds.length, 8, "The initial story cast contains eight unique companions");
companionIds.forEach(id => {
  const companion = game.GameData.companions[id];
  const portrait = game.GameData.portraits[companion.portraitId];
  assert.strictEqual(portrait.companionId, id, `${id} uses its own story portrait`);
});
const portraitMigrationTarget = { characters: [
  { id: "legacy-mina", portraitId: "birth-blacksmith-1", source: { type: "companion", companionId: "mina" } },
  { id: "custom-mina", portraitId: "legacy-06", source: { type: "companion", companionId: "mina" } }
] };
game.GameState.ensureCharacterSources(portraitMigrationTarget);
assert.strictEqual(portraitMigrationTarget.characters[0].portraitId, "companion-mina", "The former default portrait upgrades to Mina's dedicated image");
assert.strictEqual(portraitMigrationTarget.characters[1].portraitId, "legacy-06", "A manually selected portrait remains unchanged");
assert.deepStrictEqual(Object.values(game.GameData.relations.companionStoryArcs).map(arc => arc.joinChapterId), ["seal", "starfall", "ember_crown", "mirror_tide", "clockwork_desert", "blackwood_pilgrimage", "thunder_snow_peaks", "northern_star_tomb"]);
Object.values(game.GameData.relations.companionStoryArcs).forEach(arc => {
  const chapter = game.GameData.storyChapters.find(entry => entry.id === arc.joinChapterId);
  assert(game.GameData.relations.storyTriggers.some(trigger => trigger.when.type === "chapterActive" && trigger.when.chapterId === chapter.id && trigger.effects.some(effect => effect.type === "joinCompanion" && effect.companionId === arc.companionId)), `${arc.companionId} has a chapter-active join trigger`);
  assert.strictEqual(game.Story.scene(chapter.openingStoryId).protagonistId, arc.companionId, `${arc.companionId} leads the joining chapter`);
});

require("./helpers").createCharacter(game, "先行隊", "warrior");
require("./helpers").completeThrough(game, "roadside");
assert.strictEqual(game.Story.current().id, "seal");
assert(game.Companions.character("mina"), "Mina joins as soon as her chapter and opening scene become active");
assert(!state.story.completed.includes("seal"), "Joining does not wait for the character's starring chapter to be cleared");
require("./helpers").completeThrough(game, "starsea_corridor");
const noah = game.Companions.character("noah");
assert(noah && noah.name === "ノア" && noah.level === 97, "Chapter 13 opening adds Noah at the configured level");
assert.strictEqual(game.Story.current().id, "northern_star_tomb");
assert(!state.story.completed.includes("northern_star_tomb"), "Noah joins before any Chapter 13 route is cleared");
assert.deepStrictEqual(Array.from(state.story.joinedCompanionIds).sort(), companionIds.sort(), "All eight story companions join when their starring chapter begins");

const chapter = game.GameData.storyChapters.find(entry => entry.id === "northern_star_tomb");
const routes = game.Story.chapterDungeons(chapter.id).filter(route => route.requiredForStory);
let finalResult;
routes.forEach((route, index) => {
  const result = { success: true, dungeonId: route.id };
  game.Story.recordResult(result);
  if (index === routes.length - 1) finalResult = result;
});

assert.deepStrictEqual(JSON.parse(JSON.stringify(noah.source)), { type: "companion", companionId: "noah" });
assert(!Object.prototype.hasOwnProperty.call(noah, "base"), "Companion master stats are not duplicated into the save");
assert(!finalResult.newCompanionIds, "Clearing a chapter does not repeat a companion who joined at its opening");
assert(state.story.joinedCompanionIds.includes("noah") && state.characters.filter(entry => entry.source?.companionId === "noah").length === 1);
assert.strictEqual(state.characters.filter(entry => entry.source?.type === "companion").length, 8);
companionIds.forEach(id => assert(game.Characters.learnedSkills(game.Companions.character(id)).filter(skill => skill.sources.includes(`${game.GameData.companions[id].name}固有`)).length >= 2, `${id} has at least two personal skills`));
assert(["mina", "elena", "garm", "shia", "tio", "rize", "kai", "noah"].every(id => Object.keys(game.GameData.relations.companionProgressions[id].stages).length >= 2), "Every story companion has a personal growth stage");

[
  ["white_sand_road_discovery", "tio", "mina"],
  ["whispering_roots_discovery", "rize", "shia"],
  ["frozen_sky_bridge_discovery", "kai", "garm"],
  ["falling_sky_castle_opening", "elena", "kai"],
  ["sealed_memory_ward_discovery", "tio", "elena"],
  ["memory_moss_woods_discovery", "rize", "elena"],
  ["submerged_temple_discovery", "shia", "tio"],
  ["black_aurora_field_discovery", "noah", "shia"],
  ["north_return_road_discovery", "garm", "noah"]
].forEach(([sceneId, protagonistId, partnerId]) => {
  const scene = game.Story.scene(sceneId);
  assert.strictEqual(scene.protagonistId, protagonistId, `${sceneId} has a clear viewpoint character`);
  assert(scene.castIds.includes(partnerId), `${sceneId} includes its conversation partner`);
  assert((scene.text.match(/『/g) || []).length >= 2, `${sceneId} contains a short exchange between named companions`);
});

["white_sand_road_discovery", "origin_tree_heart_discovery", "starsea_nucleus_discovery", "usurper_throne_discovery"].forEach(sceneId => {
  const text = game.Story.scene(sceneId).text;
  assert(text.includes("使者") && text.includes("『"), `${sceneId} presents a direct envoy encounter instead of another trace or document`);
});

function resolvePersonalExpedition({ companionId, dungeonId, stageId, originalSkillId, replacementSkillId, addedSkillId }) {
  const result = { success: true, dungeonId };
  game.Story.recordResult(result);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.companionAdvancements)), [{ companionId, stageId, previousStageId: "base" }], `${companionId} grows through ${dungeonId}`);
  assert.strictEqual(game.Companions.stageId(companionId), stageId);
  const learned = game.Characters.learnedSkills(game.Companions.character(companionId)).filter(skill => skill.sources.includes(`${game.GameData.companions[companionId].name}固有`));
  assert(learned.some(skill => skill.id === replacementSkillId) && learned.some(skill => skill.id === addedSkillId), `${companionId} gains the replacement and added personal skills`);
  assert(!learned.some(skill => skill.id === originalSkillId), `${companionId}'s original active skill is replaced`);
  assert.strictEqual(game.Story.dungeonEndingScene(game.GameData.dungeons[dungeonId]).protagonistId, companionId, `${dungeonId} records the featured companion as protagonist`);
}

[
  { companionId: "kai", dungeonId: "white_dragon_roost", stageId: "earthward_hunter", originalSkillId: "companion_kai_skyhunt", replacementSkillId: "companion_kai_whitewing_hunt", addedSkillId: "companion_kai_earthward_eye" },
  { companionId: "elena", dungeonId: "void_star_prison", stageId: "written_void_star", originalSkillId: "companion_elena_star_projection", replacementSkillId: "companion_elena_void_projection", addedSkillId: "companion_elena_living_history" },
  { companionId: "rize", dungeonId: "star_eater_rootpit", stageId: "own_story", originalSkillId: "companion_rize_nightbloom_dew", replacementSkillId: "companion_rize_story_dreamlight", addedSkillId: "companion_rize_own_tale" }
].forEach(resolvePersonalExpedition);

const mina = game.Companions.character("mina");
assert.strictEqual(game.Companions.stageId("mina"), "free_hammer", "Mina grows after resolving the clockwork city's command loop");
const minaGrowthSkills = game.Characters.learnedSkills(mina).filter(skill => skill.sources.includes("ミナ固有"));
assert(minaGrowthSkills.some(skill => skill.id === "companion_mina_liberation_hammer") && minaGrowthSkills.some(skill => skill.id === "companion_mina_machinist_oath"));
assert(!minaGrowthSkills.some(skill => skill.id === "companion_mina_tunnel_breaker"), "Mina's original technique is replaced after her personal growth");
assert.deepStrictEqual(Array.from(game.Companions.stageChain("mina"), stage => stage.id), ["base", "free_hammer"], "Reached companion stages remain available as a chronological history");

const personalSkills = game.Characters.learnedSkills(noah).filter(skill => skill.sources.includes("ノア固有"));
assert.deepStrictEqual(Array.from(personalSkills, skill => skill.id).sort(), ["companion_noah_northstar_pulse", "companion_noah_star_vessel"]);

const growthChapter = game.GameData.storyChapters.find(entry => entry.id === "returnless_capital");
let growthResult;
game.Story.chapterDungeons(growthChapter.id).filter(route => route.requiredForStory).forEach((route, index, all) => {
  const result = { success: true, dungeonId: route.id };
  game.Story.recordResult(result);
  if (index === all.length - 1) growthResult = result;
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(growthResult.companionAdvancements)), [{ companionId: "noah", stageId: "reclaimed_star", previousStageId: "base" }], "A personal story can advance a companion stage");
assert.strictEqual(game.Companions.stageId("noah"), "reclaimed_star");
const advancedSkills = game.Characters.learnedSkills(noah).filter(skill => skill.sources.includes("ノア固有"));
assert(advancedSkills.some(skill => skill.id === "companion_noah_awakened_pulse") && advancedSkills.some(skill => skill.id === "companion_noah_star_resolve"), "Growth can replace and add personal skills");
assert(!advancedSkills.some(skill => skill.id === "companion_noah_northstar_pulse"), "A replaced personal skill is no longer active");
assert.deepStrictEqual(Array.from(game.Companions.stageChain("noah"), stage => stage.id), ["base", "reclaimed_star"]);

const meadow = game.DungeonDifficulty.variant(game.GameData.dungeons.meadow, "normal");
const minaBaseMemoryKeys = ["mina_earth_echo:0", "mina_earth_echo:1"];
const companionScene = partySnapshot => game.Exploration.journey(meadow, 1, 707, undefined, partySnapshot, minaBaseMemoryKeys)
  .flatMap(floor => floor.entries).find(entry => entry.kind === "companion");
assert.strictEqual(companionScene([{ companionId: "mina", companionStageId: "base" }]).momentId, "mina_earth_echo", "A growth-only travel scene stays hidden before that stage");
assert.strictEqual(companionScene([{ companionId: "mina", companionStageId: "free_hammer" }]).momentId, "mina_unbound_hammer", "A grown companion reveals new travel memories before repeating old ones");
const crossPairScene = game.Exploration.journey(meadow, 1, 808, undefined, [{ companionId: "mina", companionStageId: "free_hammer" }, { companionId: "elena", companionStageId: "written_void_star" }], [])
  .flatMap(floor => floor.entries).find(entry => entry.kind === "companion");
assert.strictEqual(crossPairScene.momentId, "mina_elena_unwritten_tool", "A discovered cross-pair relationship takes priority over either solo scene");
assert(game.GameData.config.explorationEvents.companionMoments.filter(moment => moment.companionIds.length === 2).length >= 8, "The cast offers several relationship combinations to discover");

game.Story.recordResult({
  success: false, dungeonId: "meadow",
  battleLog: [{ kind: "companion", momentId: "mina_tio_machine_doubt", companionLineIndex: 0, companionIds: ["mina", "tio"], text: game.GameData.config.explorationEvents.companionMoments.find(moment => moment.id === "mina_tio_machine_doubt").lines[0] }]
});
assert.deepStrictEqual(Array.from(state.story.facts.companionMoments), ["mina_tio_machine_doubt:0"], "Witnessed travel scenes become permanent companion memories");
game.Story.recordResult({
  success: false, dungeonId: "meadow",
  battleLog: [{ kind: "companion", momentId: "mina_tio_machine_doubt", companionLineIndex: 0, companionIds: ["mina", "tio"], text: game.GameData.config.explorationEvents.companionMoments.find(moment => moment.id === "mina_tio_machine_doubt").lines[0] }]
});
assert.strictEqual(state.story.facts.companionMoments.length, 1, "Repeating the same travel scene does not duplicate its memory");
const sealsBeforeBond = game.Items.count("guild_seal"), completedBondResult = {
  success: false, dungeonId: "meadow",
  battleLog: [{ kind: "companion", momentId: "mina_tio_machine_doubt", companionLineIndex: 1, companionIds: ["mina", "tio"], text: game.GameData.config.explorationEvents.companionMoments.find(moment => moment.id === "mina_tio_machine_doubt").lines[1] }]
};
game.Story.recordResult(completedBondResult);
assert.strictEqual(game.Items.count("guild_seal"), sealsBeforeBond + 1, "Completing both lines of a relationship grants one guild seal");
assert.deepStrictEqual(JSON.parse(JSON.stringify(completedBondResult.completedCompanionBonds)), [{ momentId: "mina_tio_machine_doubt", companionIds: ["mina", "tio"], rewardItemId: "guild_seal", rewardQuantity: 1 }], "The return result records the completed relationship and reward");
game.Story.recordResult(completedBondResult);
assert.strictEqual(game.Items.count("guild_seal"), sealsBeforeBond + 1, "A completed relationship can never grant its reward twice");

resolvePersonalExpedition({
  companionId: "garm", dungeonId: "hollow_coronation", stageId: "present_bulwark",
  originalSkillId: "companion_garm_ash_guard", replacementSkillId: "companion_garm_crownless_guard", addedSkillId: "companion_garm_living_bulwark"
});

const count = state.characters.length, nextId = state.meta.nextCharacterId;
assert.strictEqual(game.Story.sync().length, 0);
assert.strictEqual(state.characters.length, count, "Repeated story synchronization never duplicates a companion");
assert.strictEqual(state.meta.nextCharacterId, nextId);

assert(game.ClassChange.change(noah.id, "spellblade").ok, "A story companion can use the normal one-time class-change system");
assert(game.Characters.learnedSkills(noah).some(skill => skill.id === "companion_noah_star_vessel"), "Personal skills remain after class change");
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok, "Companion state passes save validation");

const duplicate = JSON.parse(JSON.stringify(state));
duplicate.characters.push(Object.assign({}, duplicate.characters.find(entry => entry.source?.companionId === "noah"), { id: `adventurer-${duplicate.meta.nextCharacterId++}` }));
assert(!game.SaveTransfer.parse(JSON.stringify(duplicate)).ok, "Duplicate unique companions are rejected");
console.log("Story companion test passed: appearance-time join, unique identity, staged skill growth and class-change retention");
