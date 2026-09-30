const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}
let game = load();
const hero = (stats = {}, skills = []) => ({ id: "adventurer-1", name: "試験役", level: 4, jobId: "mage", position: 0, weaponRange: "melee", actionRates: { attack: skills.length ? 0 : 100, technique: 0, spell: skills.length ? 100 : 0, healing: 0 }, skillIds: skills, stats: { hp: 99999, attack: 10, defense: 20, magicAttack: 50, magicDefense: 10, magicHealing: 30, hitRate: 1, evasionRate: 0, speed: 100, criticalRate: 0, ...stats } });
const dungeon = { id: "meadow", name: "試験", encounters: [{ name: "戦場", groups: [["slime"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] };
function fight(member) { return game.Battle.resolve({ seed: 42, partyIds: [], partySnapshot: [member] }, dungeon); }
const damage = result => Number(result.battleLog.find(entry => ["hero", "skill"].includes(entry.kind)).text.match(/に(\d+)ダメージ/)[1]);
game.GameRuntime.seededRandom = () => () => .5;
game.GameData.monsters.slime.hp = 99999; game.GameData.monsters.slime.attack = 1;
const magic = damage(fight(hero({}, ["fireball"])));
assert.strictEqual(damage(fight(hero({ attack: 999 }, ["fireball"]))), magic);
assert(damage(fight(hero({ magicAttack: 100 }, ["fireball"]))) > magic);
game.GameData.monsters.slime.defense = 1000;
assert.strictEqual(damage(fight(hero({}, ["fireball"]))), magic);
game.GameData.monsters.slime.magicDefense = 100;
assert(damage(fight(hero({}, ["fireball"]))) < magic);
game.GameData.monsters.slime.defense = 1; game.GameData.monsters.slime.magicDefense = 1;
const physical = damage(fight(hero()));
assert.strictEqual(damage(fight(hero({ magicAttack: 999 }))), physical);
assert(damage(fight(hero({ attack: 100 }))) > physical);
const magicBasicHero = hero({ attack: 1, magicAttack: 100 }); magicBasicHero.basicDamageType = "magic";
assert(damage(fight(magicBasicHero)) > physical && fight(magicBasicHero).battleLog.some(entry => entry.text.includes("【魔法】")));
const magicTechnique = hero({ attack: 30, magicAttack: 999 }, ["power_strike"]); magicTechnique.basicDamageType = "magic"; magicTechnique.actionRates = { attack: 0, technique: 100, spell: 0, healing: 0 };
const physicalTechnique = hero({ attack: 30, magicAttack: 1 }, ["power_strike"]); physicalTechnique.basicDamageType = "magic"; physicalTechnique.actionRates = magicTechnique.actionRates;
assert.strictEqual(damage(fight(magicTechnique)), damage(fight(physicalTechnique)), "techniques must remain physical even with a staff basic attack");
const missed = fight(hero({ hitRate: .1 }));
assert(missed.battleLog.some(entry => entry.text.includes("命中せず")));
assert.strictEqual(missed.memberReports[0].damageDealt, 0);
game.GameData.monsters.slime.evasionRate = .6;
assert.strictEqual(fight(hero()).memberReports[0].damageDealt, 0);
game.GameData.monsters.slime.evasionRate = 0;
// Healing is isolated from physical attack and uses the independent magicHealing value.
game.GameData.monsters.slime.attack = 15; game.GameData.monsters.slime.hitRate = 1;
const healer = stats => { const member = hero({ hp: 1000, attack: 1, defense: 0, ...stats }, ["heal"]); member.actionRates = { attack: 100, technique: 0, spell: 0, healing: 100 }; return member; };
const healAmount = result => Number(result.battleLog.find(entry => entry.kind === "heal").text.match(/\+(\d+)/)[1]);
assert.strictEqual(healAmount(fight(healer({ attack: 1 }))), healAmount(fight(healer({ attack: 99 }))));
assert(healAmount(fight(healer({ magicHealing: 5 }))) < healAmount(fight(healer({ magicHealing: 30 }))));
async function persistence() {
  const id = require("./helpers").createCharacter(game, "魔術師", "mage", "elf", "arcane").id;
  const character = game.Characters.get(id); character.level = 4;
  const stats = game.Characters.stats(character);
  assert(stats.magicAttack > stats.attack && stats.hitRate > 0 && stats.evasionRate > 0);
  const staff = game.Items.add("arcane_staff", 1, { source: "shop" }).instances[0];
  const baseEffects = game.Items.effects(staff);
  assert(baseEffects.magicAttack > 0 && baseEffects.magicHealing > 0);
  assert(game.Items.equip(id, staff.id).ok);
  assert(game.Characters.stats(character).magicAttack > stats.magicAttack);
  assert.strictEqual(game.Characters.basicDamageType(character), "magic");
  game.Party.toggle(id);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow" })).ok);
  assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].basicDamageType, "magic");
  assert(!("battleVersion" in game.GameState.data.expeditions[0]));
  const saved = JSON.stringify(game.GameState.data);
  assert(game.SaveTransfer.parse(saved).ok);
  const missing = JSON.parse(saved); delete missing.expeditions[0].partySnapshot[0].stats.magicAttack;
  assert(!game.SaveTransfer.parse(JSON.stringify(missing)).ok);
  const bad = JSON.parse(saved); bad.expeditions[0].partySnapshot[0].stats.evasionRate = 2;
  assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
  const badDamageType = JSON.parse(saved); badDamageType.expeditions[0].partySnapshot[0].basicDamageType = "true-damage";
  assert(!game.SaveTransfer.parse(JSON.stringify(badDamageType)).ok);
  game = load(); now += 30000;
  assert((await game.GameClient.execute("expedition.collect")).ok);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  console.log("Combat stats test passed: independent physical/magic/healing stats, magic defense, misses/evasion, equipment/affinity, snapshots, validation and offline persistence");
}
persistence().catch(error => { console.error(error); process.exitCode = 1; });
