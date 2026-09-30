const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
  for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
    if (["js/ui.js", "js/main.js"].includes(file)) continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context.window;
}
let game = load();
async function run() {
  const hero = game.Characters.get(require("./helpers").createCharacter(game, "装備検証").id); hero.level = 100;
  const other = game.Characters.get(require("./helpers").createCharacter(game, "他の冒険者").id);
  const baseline = game.Characters.stats(hero);
  const gear = [...game.Items.add("wooden_sword", 4, { source: "shop", modifiers: { hp: 8, attack: 3, defense: 2 } }).instances,
    ...game.Items.add("cloth_clothes", 4, { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances];
  for (const item of gear) assert((await game.GameClient.execute("equipment.equip", { characterId: hero.id, instanceId: item.id })).ok);
  assert.strictEqual(hero.equipment.length, 8, "Four weapons and four armors coexist without replacement");
  const final = game.Characters.stats(hero);
  const breakdown = game.Characters.statBreakdown(hero);
  for (const key of ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing"]) {
    assert.strictEqual(final[key] - baseline[key], breakdown.equipment[key]);
  }
  assert.strictEqual(game.Characters.equipmentWeight(hero), gear.reduce((sum, item) => sum + game.Items.effects(item).weight, 0));
  assert(!game.Items.equip(hero.id, gear[0].id).ok);
  assert(!game.Items.equip(other.id, gear[0].id).ok);
  assert(!game.Items.sell(gear[0].id).ok && !game.Items.dismantle(gear[0].id).ok);
  assert((await game.GameClient.execute("equipment.unequip", { characterId: hero.id, instanceId: gear[0].id })).ok);
  assert.strictEqual(hero.equipment.length, 7);
  assert(game.Items.equip(other.id, gear[0].id).ok);
  game.Party.toggle(hero.id); assert(game.Presets.save(0, "多数装備").ok);
  assert(game.Dungeon.start("meadow").ok);
  const snapshot = game.GameState.data.expeditions[0].partySnapshot;
  assert.strictEqual(snapshot[0].stats.attack, game.Characters.stats(hero).attack);
  const raw = JSON.stringify(game.GameState.data); assert(game.SaveTransfer.parse(raw).ok);
  const duplicate = JSON.parse(raw); duplicate.characters[0].equipment.push(duplicate.characters[0].equipment[0]);
  assert(!game.SaveTransfer.parse(JSON.stringify(duplicate)).ok);
  const oldShape = JSON.parse(raw); oldShape.characters[0].equipment = { weapon: null, armor: null };
  assert(!game.SaveTransfer.parse(JSON.stringify(oldShape)).ok);
  const overweight = JSON.parse(raw); overweight.characters[0].level = 1; overweight.characters[0].jobId = "mage";
  assert(!game.SaveTransfer.parse(JSON.stringify(overweight)).ok);
  const bow = Object.values(game.GameData.items).find(item => item.weaponType === "bow");
  const ranged = game.Items.add(bow.id, 1, { source: "shop" }).instances[0];
  assert(game.Items.equip(hero.id, ranged.id).ok); assert.strictEqual(game.Characters.weaponRange(hero), "mixed");
  for (const formationSize of [3, 4, 5, 6]) {
    for (let position = 0; position < formationSize; position++) {
      const at = weaponRange => game.Battle.formationMultiplier({ weaponRange, position, formationSize });
      assert(Math.abs(at("mixed") - at("melee") * at("ranged")) < 1e-12);
    }
  }
  assert(Math.abs(game.Battle.formationMultiplier({ weaponRange: "mixed", position: 1 }) - .697) < 1e-12);
  hero.equipment.reverse();
  assert.strictEqual(game.Characters.weaponRange(hero), "mixed", "Equipment order must not change formation penalties");
  for (const item of gear.slice(1, 4)) assert(game.Items.unequip(hero.id, item.id).ok);
  assert.strictEqual(game.Characters.weaponRange(hero), "ranged");
  game.GameState.save(); game = load();
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  assert.strictEqual(game.Characters.weaponRange(game.Characters.get(hero.id)), "ranged");
  const endsAt = game.GameState.data.expeditions[0].endsAt;
  game.GameRuntime.configure({ now: () => endsAt });
  assert((await game.GameClient.execute("expedition.collect")).ok);
  assert(game.Presets.apply(0).ok); assert.strictEqual(game.Characters.get(hero.id).equipment.length, 7);
  assert(game.Items.equip(hero.id, ranged.id).ok);
  assert(game.Dungeon.start("meadow").ok);
  assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].weaponRange, "mixed");
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  const outcome = game.Battle.resolve(game.GameState.data.expeditions[0], game.GameData.dungeons.meadow);
  assert(outcome.battleLog.some(entry => entry.kind === "formation" && entry.text.includes("近接・遠距離併用") && entry.text.includes("62%")));
  const capacity = game.Characters.maxWeight; game.Characters.maxWeight = () => 0;
  const before = JSON.stringify(game.Characters.get(hero.id).equipment);
  assert(!game.Items.equip(hero.id, "item-1").ok);
  assert.strictEqual(JSON.stringify(game.Characters.get(hero.id).equipment), before);
  game.Characters.maxWeight = capacity;
  console.log("Unlimited equipment test passed: multiple same-type gear, all stats, weight, identity/ownership, individual removal, snapshot/preset/save, validation and mixed-weapon range");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
