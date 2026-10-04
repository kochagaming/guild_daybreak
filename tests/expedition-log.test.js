const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), listeners = {}, nodes = new Map();
let now = 1700000000000;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", dataset: {}, scrollTop: 0, focus() {}, classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: selector => node(selector), querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .42 });
}
const game = context.window, create = require("./helpers").createCharacter;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, disabled: false, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? button : null } });
}

async function run() {
  game.GameState.reset();
  const heroes = [];
  for (const [name, job] of [["盾役", "warrior"], ["術師", "mage"], ["癒し手", "cleric"]]) {
    const hero = game.Characters.get(create(game, name, job).id);
    hero.level = 20;
    heroes.push(hero);
    game.Party.toggle(hero.id);
  }
  heroes[0].source = { type: "companion", companionId: "mina" };
  heroes[1].source = { type: "companion", companionId: "tio" };
  assert(game.Dungeon.start("meadow", 0, 2).ok);
  const expedition = game.GameState.data.expeditions[0];
  assert(expedition.rumor && expedition.rumor.dungeonId === "meadow", "An enterable route carries the current traveler rumor into the expedition snapshot");
  assert.deepStrictEqual(Array.from(expedition.knownCompanionMomentKeys), [], "A departure snapshots the travel memories known at that moment");
  assert.deepStrictEqual(Array.from(expedition.partySnapshot.slice(0, 2), member => member.companionStageId), ["base", "base"], "A departure snapshots each story companion's growth stage");
  const planned = game.ExpeditionLog.preview(expedition);
  const kinds = planned.battleLog.map(entry => entry.kind);
  assert(kinds.includes("arrival") && kinds.includes("explore") && kinds.includes("companion") && kinds.includes("story") && kinds.includes("treasure") && kinds.includes("stairs"));
  assert(["secret", "camp", "hazard", "lore", "gather"].some(kind => kinds.includes(kind)), "Every departure includes one non-combat route event");
  const companionMoment = planned.battleLog.find(entry => entry.kind === "companion");
  assert.deepStrictEqual(Array.from(companionMoment.companionIds), ["mina", "tio"], "A matching two-person exchange takes priority over solo travel moments");
  const knownKey = `${companionMoment.momentId}:${companionMoment.companionLineIndex}`;
  const nextJourney = game.Exploration.journey(game.DungeonDifficulty.variant(game.GameData.dungeons.meadow, "normal"), 2, expedition.seed, expedition.acquisitionBonuses.itemRate, expedition.partySnapshot, [knownKey]);
  const nextMoment = nextJourney.flatMap(floor => floor.entries).find(entry => entry.kind === "companion");
  assert(nextMoment && `${nextMoment.momentId}:${nextMoment.companionLineIndex}` !== knownKey, "The next departure prioritizes an unseen line for the same companion pair");
  assert(planned.battleLog.some(entry => entry.kind === "story" && entry.sceneId === game.GameData.relations.dungeonStoryLinks.meadow.discoveryStoryId), "Dungeon story discovery should appear in the live exploration record");
  assert(kinds.includes("treasureGold") || kinds.includes("treasureItem"));
  assert(kinds.indexOf("arrival") < kinds.indexOf("encounter"), "Exploration must be recorded before the floor battle");
  const opening = game.ExpeditionLog.active(expedition, expedition.startedAt);
  assert(opening.setup.length && opening.events.length === 0);
  const middle = game.ExpeditionLog.active(expedition, expedition.startedAt + (expedition.endsAt - expedition.startedAt) * .5);
  assert(middle.events.length > 0 && middle.events[0].entries.some(entry => entry.kind === "encounter"));
  assert(middle.events.every(event => event.entries.every(entry => entry.encounter === event.number)));
  const observations = game.ExpeditionLog.observations([
    { kind: "enemy-skill", text: "【敵技】粘液波" },
    { kind: "skill", text: "【リアクション】即時調薬" },
    { kind: "status", text: "【状態異常解除】毒" }
  ]);
  assert(observations.some(group => group.label === "敵の特殊行動" && group.entries[0].includes("粘液波")));
  assert(observations.some(group => group.label === "即応" && group.entries[0].includes("即時調薬")));

  game.UI.init(); game.UI.navigate("party"); await click("party-view", { view: "adventure" });
  now = expedition.startedAt + (expedition.endsAt - expedition.startedAt) * .5;
  game.UI.render();
  let html = node("app").innerHTML;
  assert(html.includes("LIVE ADVENTURE LOG") && html.includes("探索の記録"));
  assert(html.includes("journey-entry journey-encounter") && html.includes("battle-log-entry") && html.includes("journey-discovery companion") && html.includes("道中のひと幕"));
  assert(html.includes("journey-companion-cast") && html.includes("ミナ") && html.includes("ティオ") && html.includes("companion-mina.png") && html.includes("companion-tio.png"), "Companion moments show the named cast and their dedicated portraits");
  assert(html.includes("journey-witnesses") && html.includes("この場を歩いた冒険者") && html.includes("盾役・術師・癒し手"), "The live story clue names the actual adventurers witnessing it");
  assert(!html.includes("dungeon-grid"), "Destination cards should be replaced by the live log while exploring");

  now = expedition.endsAt;
  const result = game.Dungeon.completeIfReady(now);
  assert(result && JSON.stringify(result.battleLog) === JSON.stringify(planned.battleLog), "Live preview and completed battle log must be identical");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.rumor)), JSON.parse(JSON.stringify(expedition.rumor)), "The departure rumor remains attached to the completed result");
  assert(game.Story.ensure().facts.discoveries.includes("meadow"), "Returning from exploration should archive its discovered story clue");
  const witnessedRouteEvent = result.battleLog.find(entry => entry.routeEventId);
  const witnessedRouteDefinition = game.GameData.config.explorationEvents.routeEvents.find(event => event.id === witnessedRouteEvent.routeEventId);
  const witnessedRecord = witnessedRouteEvent && game.Story.ensure().facts.routeEvents[witnessedRouteEvent.routeEventId];
  assert(witnessedRecord?.encounters === 1 && witnessedRecord.successes === Number(witnessedRouteEvent.routeEventSuccess), "Returning permanently archives the route-event attempt and outcome");
  const routeObservation = game.GameData.observationNotes.find(note => note.unlock?.routeEventId === witnessedRouteEvent.routeEventId);
  assert(routeObservation && result.newObservationIds.includes(routeObservation.id), "The return report reveals the matching route-event diary page");
  assert.deepStrictEqual(Array.from(game.Story.ensure().facts.companionMoments), [knownKey], "Returning permanently records the witnessed companion scene");
  assert.deepStrictEqual(Array.from(result.newCompanionMomentKeys), [knownKey], "The return report marks only newly witnessed companion memories");
  assert(["first_travel_memory", "shared_travel_memory"].every(id => result.newAchievementIds.includes(id)), "The return report reveals newly completed secret travel achievements");
  assert.strictEqual(result.newAdventurerMilestones.length, 3, "Every first-time party member earns a personal first-sortie record");
  assert(result.newAdventurerMilestones.every(entry => entry.milestoneIds.includes("first_sortie")), "First-sortie medals are reported at the moment they are earned");
  assert(result.newAdventurerRecords.length > 0 && result.newAdventurerRecords.every(entry => entry.improvements.every(improvement => improvement.value > improvement.previous)), "Improved personal expedition bests are captured on return");
  const history = game.GameState.data.partyHistory[0][0];
  assert.deepStrictEqual(Array.from(history.storyMoments, moment => moment.kind), ["discovery", "ending"], "Discovered and resolved story moments remain in expedition history while the next opening waits at home");
  assert(game.Story.pendingEpisode()?.entries.some(entry => entry.kind === "dungeonOpening" && entry.dungeon?.id === "whispering_brook"), "The next route opening is waiting in the home story reader");
  assert.deepStrictEqual(Array.from(history.partySetup, member => member.name), ["盾役", "術師", "癒し手"], "The expedition history keeps the adventurers who witnessed each story moment");
  await click("party-view", { view: "results" });
  html = node("app").innerHTML;
  assert(html.includes("ADVENTURE LOG") && html.includes("探索の記録"));
  assert(html.includes("JOURNEY DISCOVERY") && html.includes("道中で起きたこと") && html.includes(witnessedRouteDefinition.name) && html.includes(witnessedRouteEvent.routeEventSuccess ? "成功" : "失敗"), "The completed report surfaces its route-event outcome before the full journal");
  assert(html.includes("journey-route-tags") && html.includes(`journey-discovery ${witnessedRouteDefinition.kind} is-route-event`) && html.includes(`<small>${witnessedRouteDefinition.name}</small>`) && html.includes(witnessedRouteEvent.routeEventSuccess ? ">成功</b>" : ">失敗</b>"), "The full journal names the exact route scene and shows its observed outcome instead of only a broad event family");
  if (witnessedRouteEvent.routeRumorMatched) assert(html.includes(">噂と一致</b>"), "A route event matching the local rumor is marked directly in the full journal");
  assert(html.includes("TREASURE FOUND") && html.includes("個の宝箱を発見") && html.includes("開封") && ["古びた木箱", "鉄縁の宝箱", "星紋の宝箱"].some(name => html.includes(name)), "The return report summarizes chest rarity, opening outcome and contents before the full journal");
  assert(html.includes("この場を歩いた冒険者") && html.includes("盾役・術師・癒し手"), "The completed journal keeps the same story witnesses");
  assert(html.includes("journey-conclusion") && html.includes("battle-log-list"));
  assert(html.includes("journey-companion-cast") && html.includes("ミナ") && html.includes("ティオ"), "The completed journal preserves the companion scene cast");
  assert(html.includes("NEW ACHIEVEMENT") && html.includes("旅の途中で") && html.includes("二人だけの歩幅") && html.includes("実績の記録を読む"), "Newly completed achievements are visible in the return report");
  assert(html.includes("NEW PERSONAL RECORD") && html.includes("初陣の記章") && html.includes("足跡を見る"), "New personal medals are visible in the return report");
  assert(html.includes("PERSONAL BEST") && html.includes("自身の遠征記録を更新") && html.includes("→"), "Personal-best improvements are visible in the return report");
  assert(html.includes("TRAVELER'S RUMOR") && html.includes("を確かめました"), "The return report recalls the traveler rumor attached at departure");
  assert(html.includes("NEW TRAVEL MEMORY") && html.includes("機械の迷い") && html.includes("ミナ・ティオ") && html.includes("人物録で読み返す"), "A newly witnessed travel memory is called out before the full log");
  assert(html.includes("battle-observation-summary") && html.includes("観測要点") && html.includes("命中・回避"), "Completed encounters summarize observable combat evidence before the full log");
  assert(!html.includes("戦闘ログを見る"), "Battle logs should be nested in encounter entries instead of a separate panel");
  await click("open-achievements");
  assert(node("app").innerHTML.includes("実績の記録") && node("app").innerHTML.includes("旅の途中で"), "The return report opens the achievement ledger directly");
  console.log("Expedition log test passed: deterministic live reveal, story discoveries, arrival/search/treasure/stairs rows, nested encounter battles and completed journal reuse");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
