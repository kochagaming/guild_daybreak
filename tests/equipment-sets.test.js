const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1])
    .filter(file => !["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file));
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => 1700000000000, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}

const game = load(), zero = { hp: 0, attack: 0, defense: 0 };
const definitions = Object.values(game.GameData.equipmentSets);
assert.strictEqual(definitions.length, 17);
assert(definitions.every(definition => definition.itemIds.length === 3 && definition.bonuses.length === 2));
assert(["ashcrown_craft", "mirrortide_craft", "timewheel_craft"].every(id => game.GameData.equipmentSets[id]), "Chapters four through six continue the equipment-set chase");
assert(["moonbriar_craft", "thunderpeak_craft", "blackwing_craft"].every(id => game.GameData.equipmentSets[id]), "Chapters seven through nine continue the equipment-set chase");
assert(["moonprison_craft", "firstroot_craft", "starsea_craft"].every(id => game.GameData.equipmentSets[id]), "Chapters ten through twelve continue the equipment-set chase");
assert(["northstar_craft", "skykey_craft", "firstlight_craft", "afterstar_craft"].every(id => game.GameData.equipmentSets[id]), "The finale and postgame continue the equipment-set chase");

const staff = game.Items.createInstance("greenwood_staff", { source: "craft", qualityId: "standard", modifiers: zero });
const vest = game.Items.createInstance("windrunner_vest", { source: "craft", qualityId: "standard", modifiers: zero });
const duplicateStaff = game.Items.createInstance("greenwood_staff", { source: "craft", qualityId: "standard", modifiers: zero });
const bow = game.Items.createInstance("hornstring_bow", { source: "craft", qualityId: "standard", modifiers: zero });
assert(!game.EquipmentSkills.activeIds([staff]).includes("set_windtrail_2"));
assert(!game.EquipmentSkills.activeIds([staff, duplicateStaff]).includes("set_windtrail_2"), "Duplicate templates count as one set piece");
assert(game.EquipmentSkills.activeIds([staff, vest]).includes("set_windtrail_2"), "Two distinct pieces activate the set bonus");
assert(!game.EquipmentSkills.activeIds([staff, vest]).includes("set_windtrail_3"), "The complete-set bonus stays inactive at two pieces");
assert(game.EquipmentSkills.activeIds([staff, vest, bow]).includes("set_windtrail_3"), "Three distinct pieces activate the complete-set bonus");
assert(!game.EquipmentSkills.ids(staff).includes("set_windtrail_2"), "Set skills are not mixed into individual item skills");

const singleAggregate = game.EquipmentSkills.aggregate([staff, vest]);
assert.strictEqual(singleAggregate.bonuses.speed, 4, "Vest speed and the set speed bonus compose");
assert.strictEqual(singleAggregate.bonuses.evasionRate, .06, "Vest evasion and the set evasion bonus compose");
const windProgress = game.EquipmentSkills.setProgress([staff, vest]).find(entry => entry.definition.id === "windtrail_craft");
assert.strictEqual(windProgress.count, 2);
assert(windProgress.active && windProgress.bonuses[0].active);
assert(game.EquipmentSkills.setsForTemplate("greenwood_staff").some(definition => definition.id === "windtrail_craft"));
let equipPreview = game.EquipmentSkills.equipPreviews([staff], vest)[0];
assert.strictEqual(equipPreview.currentCount, 1);
assert.strictEqual(equipPreview.afterCount, 2);
assert(equipPreview.advances && equipPreview.newBonuses.some(bonus => bonus.skillId === "set_windtrail_2"), "Equipping a threshold piece previews the newly activated set skill");
equipPreview = game.EquipmentSkills.equipPreviews([staff], duplicateStaff)[0];
assert.strictEqual(equipPreview.afterCount, 1);
assert(!equipPreview.advances && equipPreview.newBonuses.length === 0, "A duplicate template does not preview false set progress");

const heroId = require("./helpers").createCharacter(game, "組合せ試験者").id;
const hero = game.Characters.get(heroId);
hero.equipment = [staff.id, vest.id];
game.GameState.data.inventory.equipment.push(staff, vest);
const setStats = game.Characters.stats(hero), withoutSetStats = game.Characters.stats(hero, [staff]);
assert(setStats.speed >= withoutSetStats.speed + 2, "Character calculations include active set effects");
assert(game.Party.toggle(heroId).ok);
assert(game.Dungeon.start("meadow").ok);
assert(game.GameState.data.expeditions[0].partySnapshot[0].equipmentSkillIds.includes("set_windtrail_2"), "Departure snapshots preserve active set skills");
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.GameState.data.expeditions[0].partySnapshot[0].equipmentSetBonuses)), [{ setId: "windtrail_craft", count: 2, skillIds: ["set_windtrail_2"] }], "Departure snapshots preserve the source and threshold of active set skills");
const battleResult = game.Battle.resolve(game.GameState.data.expeditions[0], game.DungeonDifficulty.variant(game.GameData.dungeons.meadow, "normal"));
assert(battleResult.battleLog.some(entry => entry.kind === "formation" && entry.text.includes("組合せ試験者の装備組合せ【風渡りの旅装】2/3：風渡りの足並み")), "The exploration log identifies the set responsible for an active bonus");
assert(!battleResult.battleLog.some(entry => entry.kind === "system" && entry.text.includes("装備スキル") && entry.text.includes("風渡りの足並み")), "Set bonuses are not duplicated inside the generic equipment-skill line");

const invalidItem = game.GameData.equipmentSets.windtrail_craft.itemIds[0];
game.GameData.equipmentSets.windtrail_craft.itemIds[0] = "missing_item";
assert(game.GameData.registry.validate().some(message => message.includes("equipmentSets.windtrail_craft.itemIds") && message.includes("missing_item")));
game.GameData.equipmentSets.windtrail_craft.itemIds[0] = invalidItem;

const undiscoveredSetCounts = game.EquipmentSkills.discoveryCounts();
game.GameState.data.encyclopedia.items.greenwood_staff = 1;
let discoveryAdvances = game.EquipmentSkills.discoveryAdvances(undiscoveredSetCounts);
assert.deepStrictEqual(JSON.parse(JSON.stringify(discoveryAdvances)), [{ setId: "windtrail_craft", previousCount: 0, count: 1, newBonusSkillIds: [], complete: false }]);
const codexContext = { escape: value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;"), itemName: id => game.GameData.items[id].name, formatGold: value => `${value}G` };
let codex = game.GameUIViews.archives.items(codexContext);
assert(codex.includes("EQUIPMENT COMBINATIONS") && codex.includes("風渡りの旅装") && codex.includes("1/3"));
assert(codex.includes("まだ効果は判明していない") && !codex.includes("風渡りの足並み"), "One discovered piece reveals the family but not its bonus");
assert(!codex.includes("燐光坑道の備え"), "Entirely unknown set names stay hidden");
const onePieceSetCounts = game.EquipmentSkills.discoveryCounts();
game.GameState.data.encyclopedia.items.windrunner_vest = 1;
discoveryAdvances = game.EquipmentSkills.discoveryAdvances(onePieceSetCounts);
assert(discoveryAdvances[0].newBonusSkillIds.includes("set_windtrail_2"), "Crossing the two-piece discovery threshold reports its newly revealed effect");
codex = game.GameUIViews.archives.items(codexContext);
assert(codex.includes("2/3") && codex.includes("風渡りの足並み") && codex.includes("行動速度+2、回避率+2%。"), "Meeting a threshold reveals its effect in the codex");
assert(codex.includes("まだ効果は判明していない") && !codex.includes("風読む眼"), "The complete-set effect stays concealed at two discoveries");
game.GameState.data.encyclopedia.items.hornstring_bow = 1;
discoveryAdvances = game.EquipmentSkills.discoveryAdvances({ ...game.EquipmentSkills.discoveryCounts(), windtrail_craft: 2 });
assert(discoveryAdvances[0].complete && discoveryAdvances[0].newBonusSkillIds.includes("set_windtrail_3"), "Completing a set reports its final effect");
codex = game.GameUIViews.archives.items(codexContext);
assert(codex.includes("3/3") && codex.includes("全品発見") && codex.includes("風読む眼"), "The final discovery reveals the complete-set effect");

console.log("Equipment sets test passed: two/three-piece thresholds, equip previews, distinct templates, progressive codex reveal and expedition snapshots");
