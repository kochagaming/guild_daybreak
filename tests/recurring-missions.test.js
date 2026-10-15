const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000, failSave = false;
const context = vm.createContext({ window: {}, Date, Math, Blob, console: { ...console, warn() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
  if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => { if (failSave) throw Error("full"); storage.set(key, value); }, remove: key => storage.delete(key) });
}
const game = context.window, daily = () => game.RecurringMissions.state().groups.daily, weekly = () => game.RecurringMissions.state().groups.weekly;
assert.strictEqual(game.GameData.config.recurringMissions.groups[0].missions.length, 6);
assert.strictEqual(game.GameData.config.recurringMissions.groups[1].missions.length, 8);
assert.strictEqual(new Set(game.GameData.config.recurringMissions.groups.map(group => group.id)).size, game.GameData.config.recurringMissions.groups.length);
game.GameData.config.recurringMissions.groups.forEach(group => {
  assert(["daily", "weekly"].includes(group.schedule.type));
  assert(Number.isInteger(group.selection.count) && group.selection.count > 0 && group.selection.count <= group.missions.length);
  assert.strictEqual(new Set(group.missions.map(mission => mission.id)).size, group.missions.length);
  group.missions.forEach(mission => {
    assert(typeof mission.trigger === "string" && Number.isInteger(mission.target) && mission.target > 0);
    assert(game.GameData.storyCharacters[mission.issuerCharacterId] && typeof mission.flavor === "string" && mission.flavor.length > 0 && typeof mission.completionFlavor === "string" && mission.completionFlavor.length > 0, "Every recurring request has a known issuer and distinct request/completion lines");
    Object.keys(mission.rewards.materials || {}).forEach(itemId => assert.strictEqual(game.GameData.items[itemId].type, "material"));
  });
});
assert.strictEqual(daily().progress.login, 1);
assert.strictEqual(daily().claimed.length, 0);
assert(daily().selectedIds.includes("login") && daily().selectedIds.length === 3, "login should be pinned beside two rotating daily requests");
assert.strictEqual(weekly().selectedIds.length, 2);
assert.strictEqual(weekly().claimed.length, 0);
const weeklyVariants = game.RecurringMissions.active("weekly").map(entry => entry.variantGroup).filter(Boolean);
assert.strictEqual(new Set(weeklyVariants).size, weeklyVariants.length, "Two weekly requests never select easy and hard variants of the same activity together");
assert.strictEqual(game.RecurringMissions.readyCount(), 1, "The login reward is initially claimable");

async function run() {
  assert(!(await game.GameClient.execute("recurringMission.claim", { groupId: "daily", missionId: "unknown" })).ok);
  const seals = game.GameState.data.inventory.materials.guild_seal;
  failSave = true;
  assert(!(await game.GameClient.execute("recurringMission.claim", { groupId: "daily", missionId: "login" })).ok);
  failSave = false;
  assert.strictEqual(game.GameState.data.inventory.materials.guild_seal, seals);
  assert((await game.GameClient.execute("recurringMission.claim", { groupId: "daily", missionId: "login" })).ok);
  assert.strictEqual(game.GameState.data.inventory.materials.guild_seal, seals + 1);
  assert.strictEqual(game.RecurringMissions.readyCount(), 0);
  assert(!(await game.GameClient.execute("recurringMission.claim", { groupId: "daily", missionId: "login" })).ok);

  const created = require("./helpers").createCharacter(game, "日課隊", "warrior", "human", "common");
  const hero = game.Characters.get(created.id);
  hero.level = 100;
  Object.keys(hero.attributes).forEach(key => { hero.attributes[key] = 999; });
  game.Party.toggle(hero.id, 0);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  if (daily().selectedIds.includes("departure")) assert.strictEqual(daily().progress.departure, 1);
  now = game.GameState.data.expeditions[0].endsAt;
  const collected = await game.GameClient.execute("expedition.collect");
  assert(collected.ok && collected.result.success);
  if (daily().selectedIds.includes("clear")) assert.strictEqual(daily().progress.clear, 1);
  const expeditionWeeklies = game.RecurringMissions.active("weekly").filter(entry => ["departure", "clear"].includes(entry.trigger));
  expeditionWeeklies.forEach(entry => assert.strictEqual(weekly().progress[entry.id], 1, "Weekly exploration requests share the same real departure and clear events as daily requests"));
  ["facility_collect", "shop_purchase", "craft", "equipment_upgrade"].forEach(trigger => game.RecurringMissions.record(trigger));
  const beforeBulkClaim = game.GameState.data.inventory.materials.guild_seal;
  assert((await game.GameClient.execute("recurringMission.claimAll", { groupId: "daily" })).ok);
  assert.strictEqual(daily().claimed.length, 3);
  assert.strictEqual(game.GameState.data.inventory.materials.guild_seal, beforeBulkClaim + 2);
  game.RecurringMissions.active("weekly").forEach(entry => game.RecurringMissions.record(entry.trigger, entry.target));
  assert(game.RecurringMissions.active("weekly").every(entry => game.RecurringMissions.ready("weekly", entry)));
  const weeklyGold = game.GameState.data.gold, weeklySeals = game.GameState.data.inventory.materials.guild_seal;
  assert((await game.GameClient.execute("recurringMission.claimAll", { groupId: "weekly" })).ok);
  assert.strictEqual(weekly().claimed.length, 2);
  assert(game.GameState.data.gold > weeklyGold && game.GameState.data.inventory.materials.guild_seal >= weeklySeals + 4);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);

  const oldPeriod = daily().periodKey;
  now += 26 * 60 * 60 * 1000;
  assert((await game.GameClient.execute("progress.sync")).ok);
  assert.notStrictEqual(daily().periodKey, oldPeriod);
  assert.strictEqual(daily().progress.login, 1);
  assert.strictEqual(daily().progress.departure || 0, 0);
  assert.strictEqual(daily().claimed.length, 0);

  const sampleGroup = { id: "sample", schedule: { type: "weekly", resetHour: 0 }, selection: { strategy: "random", count: 2 }, missions: ["a", "b", "c", "d"].map(id => ({ id })) };
  assert.strictEqual(game.RecurringMissions.periodKey(sampleGroup, Date.parse("2026-09-28T12:00:00")), game.RecurringMissions.periodKey(sampleGroup, Date.parse("2026-10-04T12:00:00")));
  const selection = game.RecurringMissions.selectionFor(sampleGroup, "2026-09-28");
  assert.strictEqual(selection.length, 2);
  assert.strictEqual(JSON.stringify(selection), JSON.stringify(game.RecurringMissions.selectionFor(sampleGroup, "2026-09-28")));

  const additive = JSON.parse(JSON.stringify(game.GameState.data)); delete additive.recurringMissions.groups.weekly;
  assert(game.SaveTransfer.parse(JSON.stringify(additive)).ok, "a newly added recurring group should be created by the next sync");

  const invalid = JSON.parse(JSON.stringify(game.GameState.data)); invalid.recurringMissions.groups.daily.progress.missing = 1;
  assert(!game.SaveTransfer.parse(JSON.stringify(invalid)).ok);
  console.log("Recurring missions test passed: daily and varied weekly cycles, non-duplicate variants, deterministic pool selection, rewards, reset, additive groups, validation and rollback");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
