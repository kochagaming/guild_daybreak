const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
let now = 1700000000000;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
}
const game = context.window;
const html = () => node("app").innerHTML;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, classList: { contains: () => false } };
  await listeners.click({ target: { closest: () => button } });
}
async function run() {
  game.UI.init();
  assert.deepStrictEqual(Array.from(game.ObservationJournal.unread(), note => note.id), ["choosing_an_action"]);
  assert((await game.GameClient.execute("observation.read", { noteId: "choosing_an_action" })).ok);
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("weight_efficiency")));
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("hidden_passage_signs")), "Route notes stay hidden before the event is witnessed");
  const discoveredSteel = game.Items.add("steel_sword", 1, { source: "test", qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("weight_efficiency")), "Discovering steel equipment unlocks its weight-efficiency field note");
  assert(game.Items.sell(discoveredSteel.id).ok && game.ObservationJournal.unlocked(game.ObservationJournal.note("weight_efficiency")), "Discovery notes remain unlocked after selling the item");
  const id = require("./helpers").createCharacter(game, "調査隊長").id;
  game.Characters.get(id).level = 30;
  game.Party.toggle(id);
  const sealsBeforeRumor = game.Items.count("guild_seal");
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  assert(game.ObservationJournal.unread().some(note => note.id === "formation_distance"), "Departure unlocks its field note");
  now += 30000;
  const collected = await game.GameClient.execute("expedition.collect");
  assert(collected.ok && collected.result.success);
  const routeEventId = collected.result.battleLog.find(entry => entry.routeEventId)?.routeEventId;
  const routeNote = game.GameData.observationNotes.find(note => note.unlock?.routeEventId === routeEventId);
  assert(routeEventId && routeNote, "The completed expedition contains one recognized route event");
  assert.deepStrictEqual(Array.from(collected.result.newObservationIds).sort(), ["accuracy_and_flurries", "monster_spoils", routeNote.id].sort());
  const routeRecord = game.Story.ensure().facts.routeEvents[routeEventId];
  const firstRouteEntry = collected.result.battleLog.find(entry => entry.routeEventId);
  assert(routeRecord?.encounters === 1 && routeRecord.successes === Number(Boolean(firstRouteEntry?.routeEventSuccess)) && routeRecord.rumorMatches === Number(Boolean(firstRouteEntry?.routeRumorMatched)) && game.ObservationJournal.unlocked(routeNote), "Witnessed route events permanently record attempts, outcomes and rumor confirmations");
  assert.deepStrictEqual(Array.from(collected.result.newRumorConfirmationIds || []), firstRouteEntry.routeRumorMatched ? [routeEventId] : [], "The first rumor match is announced only when the witnessed event agrees with the destination clue");
  if (firstRouteEntry.routeRumorMatched) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(collected.result.rumorConfirmationReward)), { itemId: "guild_seal", quantity: 1 }, "A first field confirmation grants one configured report reward");
    assert(game.Items.count("guild_seal") >= sealsBeforeRumor + 1, "The rumor report reward is actually granted alongside any other return rewards");
  } else assert.strictEqual(collected.result.rumorConfirmationReward, undefined, "An unrelated route event creates no rumor report reward record");
  const practicedRouteNote = game.GameData.observationNotes.find(note => note.unlock?.type === "routeEventMastered" && note.unlock.routeEventId === routeEventId);
  assert(practicedRouteNote && !game.ObservationJournal.unlocked(practicedRouteNote), "A first encounter does not reveal the practiced field note");
  assert(collected.result.newMonsterInsights.length > 0 && collected.result.newMonsterInsights.every(entry => entry.firstEncounter), "A first expedition records only enemy traits that were newly observed");
  game.UI.navigate("party");
  await click("party-open", { party: "0", view: "results" });
  assert(html().includes("観察日記に3頁が加わりました") && html().includes("二撃目は、一撃目ほど素直ではない") && html().includes(routeNote.title) && html().includes("観察日記を読む"));
  assert(html().includes("敵の新しい性質を") && html().includes("初遭遇") && html().includes("モンスター図鑑で確認"), "New enemy findings are distinguished from the full combat record");
  const repeated = game.Encyclopedia.battleInsights(collected.result.monsterObservations);
  assert.strictEqual(repeated.length, 0, "Already recorded traits are not announced as new findings again");
  await click("open-observations");
  assert.strictEqual(node("page-title").textContent, "冒険者資料室");
  assert(html().includes("観察日記") && html().includes("獣の爪の下に残るもの"));
  assert(html().includes("噂の照合録") && html().includes(firstRouteEntry.routeRumorMatched ? "噂と実地記録が一致" : "兆しは観測・噂は未照合"), "The archive gives rumor confirmations a compact field ledger without exposing event odds");
  assert(html().includes("field-practice-progress") && html().includes("書き留めた成功"), "Locked practiced notes show diary-like progress without prescribing a party build");
  assert(html().includes("最も長い同行") && html().includes("同じ二人が幾度か遠征を共にすると記録されます"), "Locked relationship notes show shared-travel progress without exposing their hidden modifiers");
  const rumorLead = Object.values(game.GameData.dungeons).find(dungeon => game.Story.canEnter(dungeon.id) && !(game.Story.ensure().facts.routeEvents[game.Exploration.routeRumorEntry(dungeon).eventId]?.rumorMatches || 0));
  if (rumorLead) {
    assert(html().includes(`data-action="open-rumor-route" data-dungeon="${rumorLead.id}"`), "An unresolved rumor links to an already available field without revealing its event odds");
    await click("open-rumor-route", { dungeon: rumorLead.id });
    assert.strictEqual(node("page-title").textContent, "パーティ");
    assert(html().includes(rumorLead.name) && html().includes("未照合の噂あり"), "Following a rumor opens its destination in the selected party's departure screen");
  }
  const masteryRequired = game.GameData.config.explorationEvents.routeMastery.successes;
  game.Story.ensure().facts.routeEvents[routeEventId] = { encounters: masteryRequired - 1, successes: masteryRequired - 1, rumorMatches: 0 };
  game.Characters.get(id).base = { hp: 99999, attack: 99999, defense: 99999, magicAttack: 99999, magicDefense: 99999, magicHealing: 99999, speed: 999 };
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  const masteryExpedition = game.GameState.data.expeditions[0], meadow = game.GameData.dungeons.meadow;
  let masteryRouteEvent = null;
  for (let seed = 1; seed <= 10000; seed += 1) {
    masteryExpedition.seed = seed * 7919;
    const journey = game.Exploration.journey(meadow, 1, masteryExpedition.seed, undefined, masteryExpedition.partySnapshot, masteryExpedition.knownCompanionMomentKeys, masteryExpedition.knownRouteMasteryIds);
    masteryRouteEvent = journey.flatMap(floor => floor.entries).find(entry => entry.routeEventId === routeEventId);
    if (masteryRouteEvent?.routeEventSuccess) break;
  }
  assert(masteryRouteEvent?.routeEventSuccess, "The fixture finds a successful repeat of the same route event");
  now += 30000;
  const masteredReturn = await game.GameClient.execute("expedition.collect");
  assert(masteredReturn.ok && masteredReturn.result.newRouteMasteryIds.includes(routeEventId), "The return that crosses the success threshold announces new shared field knowledge");
  assert(masteredReturn.result.newObservationIds.includes(practicedRouteNote.id) && game.ObservationJournal.unlocked(practicedRouteNote), "The same return reveals the deeper diary entry");
  game.UI.navigate("party");
  await click("party-back");
  assert(html().includes("新しい道中知見 1種"), "The party overview keeps the newly established field knowledge visible");
  await click("party-open", { party: "0", view: "results" });
  assert(html().includes("FIELD KNOWLEDGE ESTABLISHED") && html().includes("道中の知見が仲間へ受け継がれます") && html().includes("完成した記録を読む"), "The return report celebrates route mastery separately from ordinary journal pages");
  const parsed = game.SaveTransfer.parse(JSON.stringify(game.GameState.data));
  assert(parsed.ok && parsed.state.observationJournal.readIds.includes("choosing_an_action"), "Read state survives save transfer");
  const invalidMasteryResult = JSON.parse(JSON.stringify(game.GameState.data));
  invalidMasteryResult.lastResult.newRouteMasteryIds = ["missing-route-event"];
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidMasteryResult)).ok, "Unknown route mastery unlocks are rejected from saved return reports");
  console.log("Observation journal test passed: persistent read state, progress unlock notices, shared route knowledge, result celebration and archive routing");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
