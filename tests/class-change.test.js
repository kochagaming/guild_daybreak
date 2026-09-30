const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => 1700000000000, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}

const game = load(), create = require("./helpers").createCharacter;
game.GameState.reset();
assert.strictEqual(Object.keys(game.GameData.classChanges).length, 15);
Object.keys(game.GameData.jobs).forEach(id => assert(game.GameData.classChanges[id] && game.GameData.skills[game.GameData.classChanges[id].masterSkillId]));
const hero = game.Characters.get(create(game, "転職試験", "warrior").id);
hero.level = 10;
hero.base = { hp: 150, attack: 40, defense: 35, magicAttack: 50, magicDefense: 40, magicHealing: 45 };
const sword = game.Items.add("wooden_sword", 1, { source: "test", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: ["physical_power_3"] }).instances[0];
hero.equipment.push(sword.id);
const quote = game.ClassChange.quote(hero.id, "mage");
assert(quote.eligible);
assert.deepStrictEqual(Array.from(quote.retainedSkillIds), Array.from(game.GameData.skillGrants.job.warrior).filter(entry => entry.initial).map(entry => entry.skillId));
const changed = game.GameCommands.dispatch({ version: 1, type: "character.classChange", payload: { characterId: hero.id, targetJobId: "mage" } });
assert(changed.ok);
assert.strictEqual(hero.jobId, "mage");
assert.strictEqual(hero.level, 1);
assert.strictEqual(hero.exp, 0);
assert.strictEqual(hero.equipment.length, 0);
assert(hero.career && hero.career.previousJobId === "warrior" && !hero.career.master);
const learned = game.Characters.learnedSkills(hero).map(skill => skill.id);
assert(game.GameData.skillGrants.job.warrior.filter(entry => entry.initial).every(entry => learned.includes(entry.skillId)));
assert(!learned.includes("power_strike") && !learned.includes("rear_protection") && !learned.includes("job_warrior_discipline"), "level-based former job skills must not be retained");
assert(game.GameData.skillGrants.job.mage.filter(entry => entry.initial).every(entry => learned.includes(entry.skillId)));
assert(!learned.includes("fireball") && !learned.includes("job_mage_focus"), "new job level skills should require their milestones");
assert(!game.ClassChange.change(hero.id, "cleric").ok, "a second class change must be rejected");

const master = game.Characters.get(create(game, "熟練戦士", "warrior").id);
master.level = 50;
assert(game.ClassChange.quote(master.id, "warrior").eligible);
assert(game.ClassChange.change(master.id, "warrior").ok);
assert(master.career.master);
assert.strictEqual(game.Characters.jobName(master), "戦士マスター");
assert(game.Characters.learnedSkills(master).some(skill => skill.id === "master_rear_protection"));

const busy = game.Characters.get(create(game, "探索中", "warrior").id);
busy.level = 50;
game.GameState.data.expeditions[0] = { partyIds: [busy.id] };
assert(!game.ClassChange.quote(busy.id, "warrior").eligible);
game.GameState.data.expeditions[0] = null;
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
const additive = JSON.parse(JSON.stringify(game.GameState.data));
delete additive.characters[0].career;
const parsed = game.SaveTransfer.parse(JSON.stringify(additive));
assert(!parsed.ok);
console.log("Class change test passed: stat gates, one-time change, level reset, equipment removal, retained former skills, master class, expedition lock and strict current-save validation");
