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
  game.GameState.data.story.readSceneIds.push("whispering_brook_clear");
  assert.deepStrictEqual(Array.from(game.ObservationJournal.unread(), note => note.id), ["choosing_an_action"]);
  assert((await game.GameClient.execute("observation.read", { noteId: "choosing_an_action" })).ok);
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("weight_efficiency")));
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("abyss_spoils")) && !game.ObservationJournal.unlocked(game.ObservationJournal.note("divine_spoils")), "Hard-mode findings stay blank before the corresponding difficulty is cleared");
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("hidden_passage_signs")), "Route notes stay hidden before the event is witnessed");
  const discoveredSteel = game.Items.add("steel_sword", 1, { source: "test", qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("weight_efficiency")), "Discovering steel equipment unlocks its weight-efficiency field note");
  assert(game.Items.sell(discoveredSteel.id).ok && game.ObservationJournal.unlocked(game.ObservationJournal.note("weight_efficiency")), "Discovery notes remain unlocked after selling the item");
  game.Story.ensure().facts.difficultyClears.push("meadow:abyss");
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("abyss_spoils")) && !game.ObservationJournal.unlocked(game.ObservationJournal.note("divine_spoils")), "The first abyss clear reveals only the abyss field note");
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("abyss_atlas_complete")), "One hard-mode route does not reveal the full chapter-map diary");
  const roadsideRoutes = Object.values(game.GameData.dungeons).filter(dungeon => dungeon.chapterId === "roadside" && dungeon.requiredForStory);
  const earlierClears = game.Story.ensure().facts.clears.slice();
  const earlierReadSceneIds = game.Story.ensure().readSceneIds.slice();
  roadsideRoutes.forEach(dungeon => { if (!game.Story.ensure().facts.clears.includes(dungeon.id)) game.Story.ensure().facts.clears.push(dungeon.id); });
  game.Story.ensure().readSceneIds = Object.keys(game.GameData.storyScenes);
  await click("open-observations");
  assert(html().includes("最も近い踏破図・第1章：街道の異変") && html().includes("1 / 5"), "A locked chapter-map diary shows the closest known chapter as a readable progress line");
  assert(html().includes('data-action="open-target-destination" data-dungeon="whispering_brook" data-difficulty="abyss"'), "The unfinished diary page links to the next enterable hard-mode route");
  game.Story.ensure().facts.clears = earlierClears;
  game.Story.ensure().readSceneIds = earlierReadSceneIds;
  game.Story.ensure().facts.difficultyClears.push("meadow:divine");
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("divine_spoils")), "The first divine clear reveals the inherited divine field note");
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("divine_atlas_complete")), "One divine route does not reveal the full pilgrimage-map diary");
  roadsideRoutes.forEach(dungeon => {
    const key = `${dungeon.id}:abyss`;
    if (!game.Story.ensure().facts.difficultyClears.includes(key)) game.Story.ensure().facts.difficultyClears.push(key);
  });
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("abyss_atlas_complete")), "Completing every required abyss route in one chapter reveals its narrative map diary");
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("divine_atlas_complete")), "A completed abyss map does not reveal the divine pilgrimage diary");
  await click("open-observations", { note: "abyss_atlas_complete" });
  assert(html().includes("綴じられた踏破図") && html().includes("LIVING CHAPTER MAPS") && html().includes("綴じ込み済み") && html().includes("魔境 5 / 5"), "An unlocked chapter-map diary grows into a living compact atlas of completed chapters");
  assert(html().includes("まだ使われていない地図") && html().includes('data-dungeon="meadow" data-difficulty="abyss">地図を使いに行く'), "A newly completed map invites the player to put its permanent guidance to use");
  game.GameState.data.partyHistory[0].push(
    { id: "map-guide-1", completedAt: now - 1000, dungeonId: "meadow", difficultyId: "abyss", chapterMapBenefit: { label: "赤糸の道案内", explorationTimeMultiplier: .95, reductionPercent: 5, secondsSaved: 3 } },
    { id: "map-guide-2", completedAt: now, dungeonId: "whispering_brook", difficultyId: "abyss", chapterMapBenefit: { label: "赤糸の道案内", explorationTimeMultiplier: .95, reductionPercent: 5, secondsSaved: 4 } }
  );
  await click("open-observations", { note: "abyss_atlas_complete" });
  assert(html().includes("2回の道案内 · 計7秒短縮") && html().includes("最後に第1パーティが") && html().includes('data-dungeon="whispering_brook" data-difficulty="abyss">最後の道をたどる'), "The living map totals its recent usefulness and links back to the latest guided route");
  const mappedMonsterId = game.GameData.dungeons.meadow.encounters[0].groups[0][0];
  const previousMappedMonsterRecord = game.GameState.data.encyclopedia.monsters[mappedMonsterId];
  game.Story.ensure().facts.clears = [...game.Story.ensure().facts.clears];
  if (!game.Story.ensure().facts.clears.includes("meadow")) game.Story.ensure().facts.clears.push("meadow");
  game.GameState.data.encyclopedia.monsters[mappedMonsterId] = { encountered: 1, defeated: 1, habitats: { meadow: { abyss: { encountered: 1, defeated: 1 } } } };
  game.GameState.data.encyclopedia.monsterTarget = { monsterId: mappedMonsterId, quantity: 3, progress: 0 };
  await click("open-observations", { note: "abyss_atlas_complete" });
  assert(html().includes(`現在の目標「${game.GameData.monsters[mappedMonsterId].name}」`) && html().includes('data-dungeon="meadow" data-difficulty="abyss">目標の道をたどる'), "A completed map prioritizes a known route that advances the current hunt over the most recently repeated route");
  game.GameState.data.encyclopedia.monsterTarget = null;
  if (previousMappedMonsterRecord) game.GameState.data.encyclopedia.monsters[mappedMonsterId] = previousMappedMonsterRecord;
  else delete game.GameState.data.encyclopedia.monsters[mappedMonsterId];
  game.Story.ensure().facts.clears = [...earlierClears];
  game.GameState.data.partyHistory[0].splice(-2);
  game.Story.ensure().facts.difficultyClears = [];
  const id = require("./helpers").createCharacter(game, "調査隊長").id;
  const investigator = game.Characters.get(id);
  investigator.level = 30;
  const harvestMonsterId = Object.keys(game.GameData.monsters).find(monsterId => game.MonsterLoot.fixedDropIds(monsterId, "normal").some(itemId => game.GameData.items[itemId]?.type === "material"));
  const harvestItemId = game.MonsterLoot.fixedDropIds(harvestMonsterId, "normal").find(itemId => game.GameData.items[itemId]?.type === "material");
  investigator.expeditionRecord.targetedHarvestRecords[`${harvestMonsterId}::${harvestItemId}`] = { attempts: 2, successes: 2, items: 2, lastAt: now };
  investigator.expeditionRecord.targetedHarvestAttempts = 2;
  investigator.expeditionRecord.targetedHarvestSuccesses = 2;
  investigator.expeditionRecord.targetedHarvestItems = 2;
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("targeted_harvest_practice")), "Two exact harvest successes leave the field-practice diary page unfinished");
  game.Characters.learnedSkills(investigator).filter(skill => skill.activation?.type === "active").forEach(skill => {
    investigator.expeditionRecord.skillRecords[skill.id] = { uses: 9, damage: 0, healing: 0, statuses: 0 };
  });
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("signature_skill_practice")), "Nine uses leave the signature-skill diary page unfinished");
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
  assert.deepStrictEqual(Array.from(collected.result.newObservationIds).sort(), ["accuracy_and_flurries", "monster_spoils", "signature_skill_practice", routeNote.id].sort());
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("signature_skill_practice")), "The return that crosses ten uses unlocks the narrative skill-practice note");
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
  const firstOrdinaryObservationId = collected.result.newObservationIds[0];
  assert(html().includes("観察日記に4頁が加わりました") && html().includes("二撃目は、一撃目ほど素直ではない") && html().includes("技に、持ち主の癖が馴染むまで") && html().includes(routeNote.title) && html().includes("最初の新しい頁を読む") && html().includes(`data-note="${firstOrdinaryObservationId}"`));
  assert(html().includes("敵の新しい性質を") && html().includes("初遭遇") && html().includes("モンスター図鑑で確認"), "New enemy findings are distinguished from the full combat record");
  const repeated = game.Encyclopedia.battleInsights(collected.result.monsterObservations);
  assert.strictEqual(repeated.length, 0, "Already recorded traits are not announced as new findings again");
  await click("open-observations", { note: firstOrdinaryObservationId });
  assert.strictEqual(node("page-title").textContent, "冒険者資料室");
  assert(html().includes("観察日記") && html().includes("獣の爪の下に残るもの") && html().includes(`data-observation="${firstOrdinaryObservationId}" open`), "A return report opens the exact first new diary page instead of the top of the journal");
  assert(html().includes("噂の照合録") && html().includes(firstRouteEntry.routeRumorMatched ? "噂と実地記録が一致" : "兆しは観測・噂は未照合"), "The archive gives rumor confirmations a compact field ledger without exposing event odds");
  assert(html().includes("field-practice-progress") && html().includes("書き留めた成功"), "Locked practiced notes show diary-like progress without prescribing a party build");
  assert(html().includes("最も長い同行") && html().includes("同じ二人が幾度か遠征を共にすると記録されます"), "Locked relationship notes show shared-travel progress without exposing their hidden modifiers");
  assert(html().includes("最も深い狙い採り") && html().includes("2 / 3"), "The locked harvest-practice page shows only the deepest observed progress");
  assert(html().includes("書き留めた空振り") && html().includes("0 / 3"), "The locked failed-harvest page acknowledges attempts without exposing its hidden modifier");
  const rumorLead = Object.values(game.GameData.dungeons).find(dungeon => game.Story.canEnter(dungeon.id) && !(game.Story.ensure().facts.routeEvents[game.Exploration.routeRumorEntry(dungeon).eventId]?.rumorMatches || 0));
  if (rumorLead) {
    assert(html().includes(`data-action="open-rumor-route" data-dungeon="${rumorLead.id}"`), "An unresolved rumor links to an already available field without revealing its event odds");
    await click("open-rumor-route", { dungeon: rumorLead.id });
    assert.strictEqual(node("page-title").textContent, "パーティ");
    assert(html().includes(rumorLead.name) && html().includes("未照合の噂あり"), "Following a rumor opens its destination in the selected party's departure screen");
  }
  const masteryRequired = game.GameData.config.explorationEvents.routeMastery.successes;
  game.Story.ensure().facts.routeEvents[routeEventId] = { encounters: masteryRequired - 1, successes: masteryRequired - 1, rumorMatches: 0 };
  Object.keys(game.Characters.get(id).attributes).forEach(key => { game.Characters.get(id).attributes[key] = 999; });
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
  assert(html().includes("FIELD KNOWLEDGE ESTABLISHED") && html().includes("道中の知見が仲間へ受け継がれます") && html().includes("完成した記録を読む") && html().includes(`data-note="${practicedRouteNote.id}"`), "The return report celebrates route mastery separately and links to its exact completed field note");
  investigator.expeditionRecord.targetedHarvestRecords[`${harvestMonsterId}::${harvestItemId}`] = { attempts: 6, successes: 3, items: 3, lastAt: now };
  investigator.expeditionRecord.targetedHarvestAttempts = 6;
  investigator.expeditionRecord.targetedHarvestSuccesses = 3;
  investigator.expeditionRecord.targetedHarvestItems = 3;
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("targeted_harvest_practice")), "Three exact harvest successes reveal the narrative field-practice note");
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("targeted_harvest_persistence")), "Three misses against the same exact pair reveal the failed-harvest field note");
  const secondInvestigator = game.Characters.get(require("./helpers").createCharacter(game, "痕跡係").id);
  secondInvestigator.expeditionRecord.targetedHarvestRecords[`${harvestMonsterId}::${harvestItemId}`] = { attempts: 3, successes: 0, items: 0, lastAt: now };
  secondInvestigator.expeditionRecord.targetedHarvestAttempts = 3;
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("targeted_harvest_consultation")), "Different adventurers carrying success and failure knowledge for the same target reveal the consultation diary page");
  const routeNewcomer = game.Characters.get(require("./helpers").createCharacter(game, "道習い").id);
  assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("route_mentorship")) && !game.ObservationJournal.unlocked(game.ObservationJournal.note("route_mentorship_lineage")), "Route-teaching diary pages remain blank before a guide passes on a path");
  game.Characters.recordRouteMentorship(investigator, { role: "mentor", partnerCharacterId: secondInvestigator.id, dungeonId: "meadow", difficultyId: "normal", completedAt: now });
  game.Characters.recordRouteMentorship(secondInvestigator, { role: "apprentice", partnerCharacterId: investigator.id, dungeonId: "meadow", difficultyId: "normal", completedAt: now });
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("route_mentorship")) && !game.ObservationJournal.unlocked(game.ObservationJournal.note("route_mentorship_lineage")), "The first guide-to-newcomer record reveals only the introductory mentorship page");
  game.Characters.recordRouteMentorship(secondInvestigator, { role: "mentor", partnerCharacterId: routeNewcomer.id, dungeonId: "meadow", difficultyId: "normal", completedAt: now + 1 });
  game.Characters.recordRouteMentorship(routeNewcomer, { role: "apprentice", partnerCharacterId: secondInvestigator.id, dungeonId: "meadow", difficultyId: "normal", completedAt: now + 1 });
  assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("route_mentorship_lineage")), "Teaching the exact route onward reveals the lineage diary page");
  assert(game.ObservationJournal.unread().some(note => note.id === "targeted_harvest_practice"), "The newly revealed harvest-practice page is announced as unread");
  const parsed = game.SaveTransfer.parse(JSON.stringify(game.GameState.data));
  assert(parsed.ok && parsed.state.observationJournal.readIds.includes("choosing_an_action"), "Read state survives save transfer");
  const invalidMasteryResult = JSON.parse(JSON.stringify(game.GameState.data));
  invalidMasteryResult.lastResult.newRouteMasteryIds = ["missing-route-event"];
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidMasteryResult)).ok, "Unknown route mastery unlocks are rejected from saved return reports");
  console.log("Observation journal test passed: persistent read state, progress unlock notices, shared route knowledge, result celebration and archive routing");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
