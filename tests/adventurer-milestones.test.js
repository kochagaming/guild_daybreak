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
assert(definitions.every(entry => ["record", "routeEventRecord", "specialtyCount", "sharedSorties"].includes(entry.condition.type) && entry.condition.minimum > 0), "Every milestone has a valid personal-record threshold");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.type === "sharedSorties"), entry => entry.condition.minimum), [5, 20], "Repeated travel with the same companion has two personal-record milestones");
assert.deepStrictEqual(Array.from(definitions.filter(entry => entry.condition.field === "teamSurveys"), entry => entry.condition.minimum), [1, 10], "Coordinated explorers earn personal medals for their first and tenth shared surveys");
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
game.Characters.recordExpedition(character, { damageDealt: 12000, healingDone: 5100, damageTaken: 3200, criticalHits: 50, remainingHp: 1, routeSuccesses, routeEventSuccesses, treasureOpenings: 10, teamSurveys: 10 }, true, 100, Date.now());
const longtimeCompanion = { id: "record-friend", name: "旅仲間", expeditionRecord: game.Characters.emptyExpeditionRecord() };
game.GameState.data.characters = [character, longtimeCompanion];
for (let journey = 0; journey < 20; journey += 1) game.Characters.recordSharedSortie([character.id, longtimeCompanion.id]);
assert.deepStrictEqual(Array.from(game.Characters.sharedSorties(character), entry => [entry.name, entry.count]), [["旅仲間", 20]], "Shared-sortie records identify the companion and lifetime count without changing combat stats");
character.expeditionRecord.sorties = 50;
character.expeditionRecord.victories = 100;
milestones = game.Characters.expeditionMilestones(character);
assert(milestones.every(entry => entry.complete && entry.ratio === 1), "A veteran record earns every currently defined medal");
assert.strictEqual(character.expeditionRecord.routeSuccesses, routeSuccesses);
assert.strictEqual(character.expeditionRecord.routeEventSuccesses.hidden_passage, 6);
assert.strictEqual(character.expeditionRecord.routeEventSuccesses.ancient_ward, 5);
assert.deepStrictEqual(Array.from(game.Characters.routeExperience(character), entry => [entry.id, entry.count]), [["hidden_passage", 6], ...routeEventIds.filter(id => id !== "hidden_passage").map(id => [id, 5])], "An adventurer's route experience is derived per scene and ordered by actual successes");
assert.strictEqual(JSON.stringify(Array.from(game.Characters.routeSpecialties(character), entry => entry.id)), JSON.stringify(routeEventIds), "Repeated route-event successes become compact field specialties for party building");
assert(game.Characters.routeSpecialties(character).every(entry => entry.icon && entry.title), "Each field specialty reuses its earned personal medal identity");
assert.strictEqual(character.expeditionRecord.treasureOpenings, 10);
assert.strictEqual(character.expeditionRecord.teamSurveys, 10, "A coordinated explorer keeps an individual participation record");
assert(milestones.find(entry => entry.id === "longtime_companion").complete, "Twenty shared expeditions earn the long-term companion medal");
assert.strictEqual(game.Characters.treasureSpecialty(character).id, "treasure_opening", "Ten opened sealed chests become a personal opening specialty");
assert.strictEqual(game.Characters.fieldSpecialties(character).length, routeEventIds.length + 1, "Party-building specialties combine route practice and opening experience");
assert(Object.isFrozen(milestones[0]), "Milestone results are read-only derived views");
assert(!Object.prototype.hasOwnProperty.call(character, "milestones"), "Derived medals are not duplicated in save data");
console.log("Adventurer milestones test passed: data definitions, derived progress, complete records and no duplicated save state");
