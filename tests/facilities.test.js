const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000, fail = false;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console: { log: console.log, warn() {} } });
  for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
    if (["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file)) continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => { if (fail) throw Error("quota"); storage.set(key, value); }, remove: key => storage.delete(key) });
  }
  return context.window;
}
let game = load();
const minute = 60000, initialInterval = 60 * minute;
async function run() {
  assert((await game.GameClient.execute("progress.sync")).ok);
  assert.strictEqual(game.Facilities.profile("mine").capacityMs, 60 * minute, "Initial storage holds one hour");
  assert(!game.Facilities.unlocked("herb_garden") && game.Facilities.quote("herb_garden") === null, "late facilities stay locked and produce nothing before their chapter");
  assert.deepStrictEqual(Array.from(game.GameData.facilities.mine.upgrades.speed, entry => entry.interval / minute), [60, 30, 20, 15, 12], "Speed levels follow one hour divided by level");
  const mineProduction = game.GameData.facilities.mine.upgrades.production;
  assert.deepStrictEqual(Array.from(mineProduction, entry => (entry.chanceRewards || []).length), [0, 1, 2, 3, 4], "Production upgrades reveal more kinds of rare ore");
  assert.deepStrictEqual(Array.from(mineProduction[4].chanceRewards, bonus => bonus.itemId), ["magic_stone", "glow_crystal", "starsteel_ore", "star_shard"]);
  const start = game.GameState.data.facilities.mine.startedAt;
  now += initialInterval - 1;
  assert.strictEqual(game.Facilities.quote("mine").storedDuration, 0);
  assert(!(await game.GameClient.execute("facility.collect", { facilityId: "mine" })).ok);
  assert.strictEqual(game.GameState.data.facilities.mine.startedAt, start);
  now++; game = load();
  assert.strictEqual(game.Facilities.quote("mine").materials.iron_ore, 1);
  assert.strictEqual(game.Facilities.quote("guild").gold, 20);
  assert.deepStrictEqual(Array.from(game.Facilities.collectable()).sort(), ["guild", "mine"]);

  now += initialInterval / 2;
  const beforeGuild = JSON.stringify(game.GameState.data.facilities.guild);
  assert((await game.GameClient.execute("facility.collect", { facilityId: "mine" })).ok);
  assert.strictEqual(game.GameState.data.inventory.materials.iron_ore, 1);
  assert.strictEqual(game.Facilities.quote("mine").storedDuration, 0);
  assert.strictEqual(JSON.stringify(game.GameState.data.facilities.guild), beforeGuild, "Facilities accumulate independently");

  require("./helpers").createCharacter(game, "施設監督", "warrior");
  game.Story.recordDeparture("meadow"); require("./helpers").completeThrough(game, "starfall"); game.GameState.save();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Facilities.upgradeCapacity("mine"))), {
    id: "mine", used: 0, maximum: 3, remaining: 3, total: 12,
    nextChapter: JSON.parse(JSON.stringify(game.GameData.storyChapters.find(chapter => chapter.id === "ember_crown")))
  }, "Each completed main chapter grants one shared upgrade point per facility");
  assert.strictEqual(game.Facilities.profile("guild").production.rewards.gold, 20, "Story progress no longer upgrades facilities");
  assert.strictEqual(game.Facilities.profile("mine").production.rewards.materials.iron_ore, 1);

  game.Items.add("iron_ore", 100); game.Items.add("magic_stone", 30); game.Items.add("star_shard", 10);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Facilities.upgradeQuote("mine", "production").cost)), { gold: 2500, materials: { iron_ore: 6 } });
  game.GameState.data.gold = 2499;
  const beforeInsufficientGold = JSON.stringify(game.GameState.data);
  assert(!(await game.GameClient.execute("facility.upgrade", { facilityId: "mine", trackId: "production" })).ok, "Facility upgrades require both gold and materials");
  assert.strictEqual(JSON.stringify(game.GameState.data), beforeInsufficientGold);
  game.GameState.data.gold = 1000000;
  assert((await game.GameClient.execute("facility.upgrade", { facilityId: "mine", trackId: "production" })).ok);
  assert.strictEqual(game.GameState.data.facilities.mine.levels.production, 2);
  assert.strictEqual(game.Facilities.profile("mine").production.rewards.materials.iron_ore, 2);
  assert.strictEqual(game.Facilities.profile("mine").production.chanceRewards[0].chance, .05, "Production level two can rarely yield magic stones");
  now += initialInterval;
  assert.strictEqual(game.Facilities.quote("mine").materials.iron_ore, 2, "Production upgrade changes output per cycle");

  assert((await game.GameClient.execute("facility.upgrade", { facilityId: "mine", trackId: "storage" })).ok);
  assert.strictEqual(game.Facilities.profile("mine").capacityMs, 2 * 60 * minute);
  assert.strictEqual(game.Facilities.quote("mine").materials.iron_ore, 2, "Completed output is preserved across upgrades");
  assert((await game.GameClient.execute("facility.upgrade", { facilityId: "mine", trackId: "speed" })).ok);
  assert.strictEqual(game.Facilities.profile("mine").intervalMs, 30 * minute);
  now += 30 * minute;
  assert.strictEqual(game.Facilities.quote("mine").materials.iron_ore, 4, "Speed upgrade uses the shorter interval");
  assert.strictEqual(game.Facilities.upgradeCapacity("mine").remaining, 0);
  assert(!(await game.GameClient.execute("facility.upgrade", { facilityId: "mine", trackId: "production" })).ok, "A facility cannot spend more upgrade points than story progress allows");
  const resetPreview = game.Facilities.resetQuote("mine"), ironBeforeReset = game.Items.count("iron_ore"), goldBeforeReset = game.GameState.data.gold, storedBeforeReset = game.Facilities.quote("mine").materials.iron_ore;
  assert.strictEqual(resetPreview.spent.gold, 7500);
  assert.strictEqual(resetPreview.spent.materials.iron_ore, 18);
  assert((await game.GameClient.execute("facility.reset", { facilityId: "mine" })).ok);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.GameState.data.facilities.mine.levels)), { production: 1, storage: 1, speed: 1 });
  assert.strictEqual(game.Items.count("iron_ore"), ironBeforeReset, "Reset does not refund materials spent on any track");
  assert.strictEqual(game.GameState.data.gold, goldBeforeReset, "Reset does not refund gold spent on any track");
  assert.strictEqual(game.Facilities.quote("mine").materials.iron_ore, storedBeforeReset, "Reset preserves already completed production");
  assert.strictEqual(game.Facilities.upgradeCapacity("mine").remaining, 3, "Reset makes the story-earned points available for redistribution");
  assert((await game.GameClient.execute("facility.upgrade", { facilityId: "mine", trackId: "production" })).ok, "A reset point can be reassigned by paying the material cost again");

  assert((await game.GameClient.execute("facility.upgrade", { facilityId: "guild", trackId: "production" })).ok);
  assert.strictEqual(game.Facilities.profile("guild").production.rewards.gold, 30);
  assert((await game.GameClient.execute("facility.upgrade", { facilityId: "guild", trackId: "storage" })).ok);
  now += initialInterval;
  assert(game.Facilities.quote("guild").gold >= 50, "Completed output keeps its old value and new cycles use the upgraded output");
  assert((await game.GameClient.execute("facility.collect", { facilityId: "guild" })).ok);
  now += initialInterval * 2;
  assert(game.Facilities.quote("guild").materials.guild_seal >= 1, "Periodic-reward progress survives upgrades and collection");

  now += initialInterval * 100;
  const capped = game.Facilities.quote("mine");
  assert(capped.full && capped.storedDuration <= capped.capacityMs, "Storage level determines the offline production cap");
  const cappedRewards = JSON.stringify(capped.materials);
  now += initialInterval * 100;
  assert.strictEqual(JSON.stringify(game.Facilities.quote("mine").materials), cappedRewards);

  const before = JSON.stringify(game.GameState.data);
  fail = true;
  assert(!(await game.GameClient.execute("facility.reset", { facilityId: "mine" })).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), before, "Failed saves roll back facility resets");
  assert(!(await game.GameClient.execute("facility.collect", { facilityId: "guild" })).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), before, "Failed saves roll back collection");
  fail = false;
  const gold = game.GameState.data.gold, quote = game.Facilities.quote("guild"), seals = game.Items.count("guild_seal");
  assert((await game.GameClient.execute("facility.collect", { facilityId: "guild" })).ok);
  assert.strictEqual(game.GameState.data.gold, gold + quote.gold);
  assert.strictEqual(game.Items.count("guild_seal"), seals + (quote.materials.guild_seal || 0));
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);

  require("./helpers").completeThrough(game, "blackwood_pilgrimage");
  const activationTime = now;
  assert(game.Facilities.sync() && game.Facilities.unlocked("herb_garden"));
  assert.strictEqual(game.GameState.data.facilities.herb_garden.activatedAt, activationTime);
  now += initialInterval;
  assert.strictEqual(game.Facilities.quote("herb_garden").materials.black_sap, 1, "new facilities begin production from their activation time");
  const collectable = game.Facilities.collectable();
  assert(collectable.includes("herb_garden") && collectable.length >= 2);
  const collectedAll = await game.GameClient.execute("facility.collectAll");
  assert(collectedAll.ok && collectedAll.facilities.includes("herb_garden"));
  assert.strictEqual(game.Facilities.collectable().length, 0);
  const withoutGarden = JSON.parse(JSON.stringify(game.GameState.data)); delete withoutGarden.facilities.herb_garden;
  const additiveGarden = game.SaveTransfer.parse(JSON.stringify(withoutGarden));
  assert(additiveGarden.ok && additiveGarden.state.facilities.herb_garden, "an additive facility receives safe default state on import");

  const badLevel = JSON.parse(JSON.stringify(game.GameState.data)); badLevel.facilities.mine.levels.speed = 99;
  assert(!game.SaveTransfer.parse(JSON.stringify(badLevel)).ok);
  const badStorage = JSON.parse(JSON.stringify(game.GameState.data)); badStorage.facilities.mine.storedDuration = 99 * 60 * 60 * 1000;
  assert(!game.SaveTransfer.parse(JSON.stringify(badStorage)).ok);
  assert(!(await game.GameClient.execute("facility.upgrade", { facilityId: "unknown", trackId: "speed" })).ok);
  assert(!(await game.GameClient.execute("facility.upgrade", { facilityId: "mine", trackId: "unknown" })).ok);
  assert(!(await game.GameClient.execute("facility.reset", { facilityId: "unknown" })).ok);

  game.GameState.reset(); now -= initialInterval * 2;
  assert.strictEqual(game.Facilities.quote("mine").storedDuration, 0);
  assert(!(await game.GameClient.execute("facility.collect", { facilityId: "unknown" })).ok);
  assert(!(await game.GameClient.execute("facility.collectAll", {})).ok);
  const mineState = game.GameState.data.facilities.mine;
  mineState.levels.production = 5; mineState.levels.storage = 5; mineState.levels.speed = 5; mineState.startedAt = now;
  now += 12 * initialInterval;
  const rareQuote = game.Facilities.quote("mine"), repeatedRareQuote = game.Facilities.quote("mine");
  assert.strictEqual(rareQuote.materials.iron_ore, 300);
  assert.deepStrictEqual(rareQuote.materials, repeatedRareQuote.materials, "Chance rewards are stable when the same offline production is viewed repeatedly");
  assert(["magic_stone", "glow_crystal", "starsteel_ore", "star_shard"].some(id => (rareQuote.materials[id] || 0) > 0), "Long high-level production yields at least one rare ore roll");
  const magicBefore = game.Items.count("magic_stone");
  assert((await game.GameClient.execute("facility.collect", { facilityId: "mine" })).ok);
  assert.strictEqual(game.Items.count("magic_stone"), magicBefore + (rareQuote.materials.magic_stone || 0), "Rolled ore is granted when production is collected");
  const annex = JSON.parse(JSON.stringify(game.GameData.facilities.mine));
  annex.id = "annex"; annex.name = "試験別館";
  game.GameData.facilities.annex = annex; game.GameData.config.facilities.order.push("annex");
  game.GameState.reset();
  assert(game.GameState.data.facilities.annex && game.Facilities.quote("annex"), "A master-data entry creates a usable saved facility without logic changes");
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok, "Dynamic facilities participate in save validation");
  console.log("Facilities test passed: 1-hour base storage, 1/n-hour speed levels, chapter-locked additive facilities, material upgrades, caps, persistence and rollback");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
