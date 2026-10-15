const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const game = context.window;
const definitions = game.GameData.adventurerMilestones;
assert(definitions.length >= 8, "Adventurers have several kinds of personal expedition records to earn");
assert.strictEqual(new Set(definitions.map(entry => entry.id)).size, definitions.length, "Personal milestone IDs are unique");
assert(definitions.every(entry => ["record", "routeEventRecord", "specialtyCount", "sharedSorties", "skillMasteryCount", "itemDiscoveryCount", "monsterFirstDefeatCount"].includes(entry.condition.type) && entry.condition.minimum > 0), "Every milestone has a valid personal-record threshold");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.type === "sharedSorties"), entry => entry.condition.minimum), [5, 20], "Repeated travel with the same companion has two personal-record milestones");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.type === "skillMasteryCount"), entry => entry.condition.rankId), ["familiar", "trusted", "signature"], "Every skill-mastery name can become an earned personal title");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.type === "itemDiscoveryCount"), entry => entry.condition.minimum), [1, 10], "First-find records celebrate the first and tenth item discoveries");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.type === "monsterFirstDefeatCount"), entry => entry.condition.minimum), [1, 10], "First-victory records celebrate the first and tenth new monster species");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.field === "teamSurveys"), entry => entry.condition.minimum), [1, 10], "Coordinated explorers earn personal medals for their first and tenth shared surveys");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.field === "targetedHarvestSuccesses"), entry => entry.condition.minimum), [1, 10], "Targeted harvesting celebrates the first and tenth successful returns");
const routeEventIds = game.GameData.config.explorationEvents.routeEvents.map(event => event.id);
const specialistMilestones = definitions.filter(entry => entry.condition.type === "routeEventRecord");
assert.deepStrictEqual(specialistMilestones.map(entry => entry.condition.routeEventId).sort(), routeEventIds.slice().sort(), "Every kind of route event awards one specialist medal");
assert(specialistMilestones.every(entry => entry.condition.minimum === 5), "Route-event specialist medals require five successful solutions");
const multiSpecialtyMilestones = definitions.filter(entry => entry.condition.type === "specialtyCount");
assert.deepStrictEqual(Array.from(multiSpecialtyMilestones, entry => entry.condition.minimum), [3, routeEventIds.length + 1], "Personal records celebrate both several and every field specialty without duplicated progress state");

const character = { id: "record-hero", expeditionRecord: game.Characters.emptyExpeditionRecord() };
let milestones = game.Characters.expeditionMilestones(character);
assert(milestones.every(entry => !entry.complete && entry.current === 0), "A new adventurer starts without earned record medals");

const versatile = { id: "versatile-scout", expeditionRecord: game.Characters.emptyExpeditionRecord() };
routeEventIds.slice(0, 3).forEach(id => { versatile.expeditionRecord.routeEventSuccesses[id] = 5; });
versatile.expeditionRecord.routeSuccesses = 15;
const versatileMilestones = game.Characters.expeditionMilestones(versatile);
assert(versatileMilestones.find(entry => entry.id === "three_field_specialties").complete, "Three different personal specialties earn the versatile explorer medal");
assert(!versatileMilestones.find(entry => entry.id === "all_field_specialties").complete, "The complete explorer medal stays locked until every field specialty is mastered");

const routeEventSuccesses = Object.fromEntries(routeEventIds.map(id => [id, id === "hidden_passage" ? 6 : 5]));
const routeSuccesses = Object.values(routeEventSuccesses).reduce((sum, count) => sum + count, 0);
const harvestMonsterId = Object.keys(game.GameData.monsters).find(monsterId => game.MonsterLoot.fixedDropIds(monsterId, "normal").length);
const harvestItemId = game.MonsterLoot.fixedDropIds(harvestMonsterId, "normal")[0];
game.Characters.recordExpedition(character, { damageDealt: 12000, healingDone: 5100, damageTaken: 3200, criticalHits: 50, statusAttempts: 80, statusInflicted: 50, remainingHp: 1, routeSuccesses, routeEventSuccesses, treasureOpenings: 10, teamSurveys: 10, targetedHarvestAttempts: 12, targetedHarvestSuccesses: 10, targetedHarvestItems: 14, targetedHarvestRecord: { monsterId: harvestMonsterId, itemId: harvestItemId, attempts: 12, successes: 10, items: 14 }, skillUses: { power_strike: 7 }, skillDamage: { power_strike: 1200 }, skillHealing: {}, skillStatusInflicted: {} }, true, 100, Date.now());
const longtimeCompanion = { id: "record-friend", name: "旅仲間", expeditionRecord: game.Characters.emptyExpeditionRecord() };
game.GameState.data.characters = [character, longtimeCompanion];
Object.keys(game.GameData.items).slice(0, 10).forEach((itemId, index) => {
  game.GameState.data.encyclopedia.items[itemId] = Math.max(1, game.GameState.data.encyclopedia.items[itemId] || 0);
  game.GameState.data.encyclopedia.itemDiscoveries[itemId] = { characterId: character.id, name: "記録の冒険者", roleTitle: null, dungeonId: "meadow", difficultyId: "normal", completedAt: Date.now() + index };
});
Object.keys(game.GameData.monsters).filter(monsterId => !(game.Encyclopedia.monster(monsterId)?.defeated > 0)).slice(0, 10).forEach((monsterId, index) => {
  game.Encyclopedia.recordBattle({ [monsterId]: 1 }, { [monsterId]: 1 }, {}, "normal", {
    partyIndex: 0, partyName: "記録隊", members: [{ characterId: character.id, name: "記録の冒険者", roleTitle: null }], dungeonId: "meadow", completedAt: Date.now() + index
  });
});
for (let journey = 0; journey < 20; journey += 1) game.Characters.recordSharedSortie([character.id, longtimeCompanion.id]);
assert.deepStrictEqual(Array.from(game.Characters.sharedSorties(character), entry => [entry.name, entry.count]), [["旅仲間", 20]], "Shared-sortie records identify the companion and lifetime count without changing combat stats");
character.expeditionRecord.sorties = 50;
character.expeditionRecord.victories = 100;
milestones = game.Characters.expeditionMilestones(character);
assert.strictEqual(character.expeditionRecord.routeSuccesses, routeSuccesses);
assert.strictEqual(character.expeditionRecord.routeEventSuccesses.hidden_passage, 6);
assert.strictEqual(character.expeditionRecord.routeEventSuccesses.ancient_ward, 5);
assert.deepStrictEqual(Array.from(game.Characters.routeExperience(character), entry => [entry.id, entry.count]), [["hidden_passage", 6], ...routeEventIds.filter(id => id !== "hidden_passage").map(id => [id, 5])], "An adventurer's route experience is derived per scene and ordered by actual successes");
assert.strictEqual(JSON.stringify(Array.from(game.Characters.routeSpecialties(character), entry => entry.id)), JSON.stringify(routeEventIds), "Repeated route-event successes become compact field specialties for party building");
assert(game.Characters.routeSpecialties(character).every(entry => entry.icon && entry.title), "Each field specialty reuses its earned personal medal identity");
assert.strictEqual(character.expeditionRecord.treasureOpenings, 10);
assert.strictEqual(character.expeditionRecord.teamSurveys, 10, "A coordinated explorer keeps an individual participation record");
assert.deepStrictEqual([character.expeditionRecord.targetedHarvestAttempts, character.expeditionRecord.targetedHarvestSuccesses, character.expeditionRecord.targetedHarvestItems], [12, 10, 14], "An adventurer remembers attempts, successful returns and recovered target items separately");
assert.deepStrictEqual(Array.from(game.Characters.targetedHarvestRecords(character), entry => [entry.monsterId, entry.itemId, entry.attempts, entry.successes, entry.items]), [[harvestMonsterId, harvestItemId, 12, 10, 14]], "Targeted-harvest practice remains tied to one observed monster-and-item pairing");
assert.strictEqual(game.Characters.targetedHarvestPractice(character, harvestMonsterId, harvestItemId).tier.id, "seasoned_harvester", "Repeated exact successes earn the configured hunting-practice tier");
assert.strictEqual(game.Characters.targetedHarvestPersistence(character, harvestMonsterId, harvestItemId).tier, null, "Two misses do not yet establish a failed-harvest field practice");
const consultation = game.Characters.targetedHarvestConsultation(
  { characterId: "hunter-a", characterName: "リタ", tierName: "獲物の癖を知る" },
  { characterId: "hunter-b", characterName: "ヨル", tierName: "空振りの痕跡を読む" }
);
assert(consultation && consultation.memberNames.join("・") === "リタ・ヨル" && consultation.encounter.includes("成功と空振りの記録"), "Different hunters can combine successful practice and failed-attempt traces into a derived narrative consultation");
assert.strictEqual(game.Characters.targetedHarvestConsultation(
  { characterId: "hunter-a", characterName: "リタ" },
  { characterId: "hunter-a", characterName: "リタ" }
), null, "One hunter carrying both records should not generate a redundant two-person consultation");
assert.strictEqual(character.expeditionRecord.statusAttempts, 80);
assert.strictEqual(character.expeditionRecord.statusInflicted, 50);
assert.deepStrictEqual(Array.from(game.Characters.signatureSkills(character), entry => [entry.skillId, entry.uses, entry.damage]), [["power_strike", 7, 1200]], "Frequently used active skills become a cumulative adventurer signature without duplicating definitions");
assert.strictEqual(game.Characters.signatureSkills(character)[0].mastery.current, null, "A newly used skill has not yet earned a mastery name");
assert.strictEqual(game.Characters.signatureSkills(character)[0].mastery.remaining, 3, "Skill history shows progress toward the next use-based mastery name");
game.Characters.recordExpedition(character, { remainingHp: 1, skillUses: { power_strike: 43 }, skillDamage: { power_strike: 800 } }, false, 0, Date.now());
assert.strictEqual(game.Characters.signatureSkills(character)[0].mastery.current.name, "得意技", "Repeated use derives a cosmetic mastery rank without changing combat power");
milestones = game.Characters.expeditionMilestones(character);
assert(milestones.find(entry => entry.id === "familiar_skill").complete && milestones.find(entry => entry.id === "trusted_skill").complete, "Practiced and trusted skills earn their personal record titles from existing use history");
assert(!milestones.find(entry => entry.id === "signature_skill").complete, "The signature-skill title remains locked before two hundred uses");
game.Characters.recordExpedition(character, { remainingHp: 1, skillUses: { power_strike: 150 } }, true, 0, Date.now());
milestones = game.Characters.expeditionMilestones(character);
assert.strictEqual(game.Characters.signatureSkills(character)[0].mastery.current.name, "十八番", "Two hundred uses earn the highest mastery name");
assert(milestones.find(entry => entry.id === "signature_skill").complete, "A fully mastered skill earns a selectable personal record title");
assert(milestones.every(entry => entry.complete && entry.ratio === 1), "A veteran record earns every currently defined medal");
assert(milestones.find(entry => entry.id === "fifty_status_inflictions").complete, "Repeated successful status use earns its personal medal");
assert(milestones.find(entry => entry.id === "longtime_companion").complete, "Twenty shared expeditions earn the long-term companion medal");
assert(milestones.find(entry => entry.id === "ten_item_discoveries").complete, "Ten first finds earn the discoverer's long-term medal");
assert(milestones.find(entry => entry.id === "first_targeted_harvest").complete && milestones.find(entry => entry.id === "ten_targeted_harvests").complete, "Repeated targeted harvests earn selectable personal record titles");
assert(milestones.find(entry => entry.id === "ten_monster_first_defeats").complete, "Ten guild-first monster victories earn the expedition veteran's medal");
assert.strictEqual(game.Characters.treasureSpecialty(character).id, "treasure_opening", "Ten opened sealed chests become a personal opening specialty");
assert.strictEqual(game.Characters.fieldSpecialties(character).length, routeEventIds.length + 1, "Party-building specialties combine route practice and opening experience");
assert(Object.isFrozen(milestones[0]), "Milestone results are read-only derived views");
assert(!Object.prototype.hasOwnProperty.call(character, "milestones"), "Derived medals are not duplicated in save data");
console.log("Adventurer milestones test passed: data definitions, derived progress, complete records and no duplicated save state");
