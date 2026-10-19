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
  game.GameState.data.story.readSceneIds.push("whispering_brook_clear");
  const heroes = [];
  for (const [name, job] of [["盾役", "warrior"], ["術師", "mage"], ["癒し手", "cleric"]]) {
    const hero = game.Characters.get(create(game, name, job).id);
    hero.level = 20;
    heroes.push(hero);
    game.Party.toggle(hero.id);
  }
  heroes[0].source = { type: "companion", companionId: "mina" };
  heroes[1].source = { type: "companion", companionId: "tio" };
  heroes.forEach(hero => game.Characters.learnedSkills(hero).filter(skill => skill.activation?.type === "active").forEach(skill => {
    hero.expeditionRecord.skillRecords[skill.id] = { uses: 9, damage: 0, healing: 0, statuses: 0 };
  }));
  game.GameState.data.partyHistory[1] = Array.from({ length: 3 }, (_, index) => ({
    id: `role-seed-${index}`, completedAt: now - index - 1, dungeonId: "cave", difficultyId: "normal", success: true,
    memberHighlights: [
      { kind: "damage", memberId: heroes[0].id, name: heroes[0].name, value: 1 },
      { kind: "status", memberId: heroes[1].id, name: heroes[1].name, value: 1 }
    ],
    battle: { members: [{ id: heroes[0].id, name: heroes[0].name }, { id: heroes[1].id, name: heroes[1].name }] }
  }));
  game.Encyclopedia.recordBattle({ slime: 1 }, { slime: 1 }, { slime: { incomingAttempts: 1, incomingHits: 1 } }, "normal");
  game.Encyclopedia.setTrackedMonster("slime", 20);
  game.Encyclopedia.recordMonsterTargetProgress("slime", 2);
  assert(game.Encyclopedia.setTrackedItem("slime_gel", 3).ok, "A known recipe material can be carried as the expedition's item target");
  game.Encyclopedia.recordTargetProgress("slime_gel", 1);
  assert(game.Achievements.track("first_footprint").ok, "A public expedition achievement can be tracked before departure");
  assert(game.Dungeon.start("meadow", 0, 2).ok);
  const expedition = game.GameState.data.expeditions[0];
  assert.deepStrictEqual(JSON.parse(JSON.stringify(expedition.trackedAchievement)), { id: "first_footprint", current: 0, target: 1 }, "A departure snapshots the tracked achievement before its progress changes");
  assert.strictEqual(expedition.trackedMonsterProgressAtDeparture, 2, "A departure snapshots existing hunt progress for the live journal");
  assert.strictEqual(expedition.trackedItemProgressAtDeparture, 1, "A departure snapshots existing item-target progress for the live journal");
  assert(expedition.rumor && expedition.rumor.dungeonId === "meadow", "An enterable route carries the current traveler rumor into the expedition snapshot");
  assert.deepStrictEqual(Array.from(expedition.knownCompanionMomentKeys), [], "A departure snapshots the travel memories known at that moment");
  assert.deepStrictEqual(Array.from(expedition.partySnapshot.slice(0, 2), member => member.companionStageId), ["base", "base"], "A departure snapshots each story companion's growth stage");
  assert.strictEqual(expedition.partySnapshot[0].reputation.title, "先陣", "A departure snapshots an established reputation instead of recomputing it later");
  assert.strictEqual(expedition.partySnapshot[1].reputation.title, "撹乱役", "More than one established reputation can travel with the same party");
  const reputationConversation = game.Characters.expeditionRoleConversation(heroes);
  assert(reputationConversation && reputationConversation.label === "撹乱役 × 先陣" && reputationConversation.memberNames.join("・") === "術師・盾役", "The current party can describe its emergent atmosphere without adding saved state or combat bonuses");
  const planned = game.ExpeditionLog.preview(expedition);
  const kinds = planned.battleLog.map(entry => entry.kind);
  assert(planned.battleLog.some(entry => entry.kind === "encounter" && entry.encounteredMonsterIds?.includes("slime")), "Encounter records preserve monster identities for hunt highlighting");
  assert(planned.battleLog.some(entry => entry.kind === "reputation" && entry.text.includes("先陣の盾役")), "An established reputation becomes a narrative departure beat");
  assert(planned.battleLog.some(entry => entry.kind === "reputation" && entry.text.includes("合図で守りを崩す") && entry.text.includes("その隙をもらう")), "Complementary reputations create a short departure conversation between actual adventurers");
  assert(planned.partyReturnMoment && planned.partyReturnMoment.label === "撹乱役 × 先陣" && planned.battleLog.some(entry => entry.kind === "reputation" && entry.text === planned.partyReturnMoment.text), "A complementary pair also reflects together on the actual success or retreat during the journey home");
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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(middle.milestone)), { achievementId: "first_footprint", currentAtDeparture: 0, current: 0, target: 1, gained: 0, possibleGain: 1, relevant: true }, "The live journal carries the tracked milestone and explains the progress available on this route");
  const returning = game.ExpeditionLog.active(expedition, expedition.endsAt);
  assert.strictEqual(returning.milestone.gained, 1, "A successful clear can mark its deterministic tracked milestone complete while returning");
  const collectionExpedition = { ...expedition, trackedAchievement: { id: "item_collector", current: 0, target: 30 } };
  const collectionReturn = game.ExpeditionLog.active(collectionExpedition, collectionExpedition.endsAt);
  assert(collectionReturn.milestone.possibleGain > 0 && collectionReturn.milestone.gained === 0 && collectionReturn.milestone.current === 0, "Possible collection finds are not reported as confirmed milestone progress before actual rewards are recorded");
  assert(middle.events.every(event => event.entries.every(entry => entry.encounter === event.number)));
  assert(middle.huntTarget && middle.huntTarget.monsterId === "slime" && middle.huntTarget.progressAtDeparture === 2, "The live journal exposes only the snapshotted hunt and revealed defeats");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(middle.itemTarget)), { itemId: "slime_gel", goal: 3, progressAtDeparture: 1, quantity: 0 }, "The live journal does not expose item finds from later encounters");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(returning.itemTarget)), { itemId: "slime_gel", goal: 3, progressAtDeparture: 1, quantity: 2 }, "The returning journal counts all item finds revealed by the finished route");
  const observations = game.ExpeditionLog.observations([
    { kind: "enemy-skill", text: "【敵技】粘液波" },
    { kind: "skill", text: "【リアクション】即時調薬" },
    { kind: "status", text: "【状態異常解除】毒" }
  ]);
  assert(observations.some(group => group.label === "敵の特殊行動" && group.entries[0].includes("粘液波")));
  assert(observations.some(group => group.label === "即応" && group.entries[0].includes("即時調薬")));

  game.UI.init(); game.UI.navigate("party");
  assert(node("app").innerHTML.includes("fleet-party-mood") && node("app").innerHTML.includes("隊の空気") && node("app").innerHTML.includes("撹乱役 × 先陣") && node("app").innerHTML.includes("合図で守りを崩す"), "The party overview reveals established chemistry in a compact disclosure before departure");
  await click("party-view", { view: "adventure" });
  now = expedition.startedAt + (expedition.endsAt - expedition.startedAt) * .5;
  game.UI.render();
  let html = node("app").innerHTML;
  assert(html.includes("LIVE ADVENTURE LOG") && html.includes("探索の記録"));
  assert(html.includes("journey-entry journey-encounter") && html.includes("battle-log-entry") && html.includes("journey-discovery companion") && html.includes("道中のひと幕"));
  assert(html.includes("journey-hunt-progress") && html.includes("討伐目標を追跡中") && html.includes("スライム"), "The live exploration log keeps the current hunt visible while encounters unfold");
  assert(html.includes("journey-item-progress") && html.includes("探索目標を追跡中") && html.includes("粘液") && html.includes("まだ発見していない"), "The live exploration log keeps the item target visible without exposing later finds");
  assert(html.includes("journey-milestone-progress") && html.includes("実績目標を携行中") && html.includes("最初の足跡") && html.includes("攻略できれば +1"), "The live journal keeps the guild milestone visible beside the expedition's immediate hunt");
  assert(html.includes("has-hunt-target") && html.includes("journey-hunt-target-badge") && html.includes("討伐対象"), "An encounter containing the tracked monster is visibly marked without revealing later battles");
  assert(html.includes("仲間内の呼び名") && html.includes("battle-log-entry reputation") && html.includes("先陣の盾役"), "The live journal surfaces departure reputations as a short scene");
  assert(html.includes("journey-companion-cast") && html.includes("ミナ") && html.includes("ティオ") && html.includes("companion-mina.png") && html.includes("companion-tio.png"), "Companion moments show the named cast and their dedicated portraits");
  assert(html.includes("journey-witnesses") && html.includes("この場を歩いた冒険者") && html.includes("盾役・術師・癒し手"), "The live story clue names the actual adventurers witnessing it");
  assert(!html.includes("dungeon-grid"), "Destination cards should be replaced by the live log while exploring");

  now = expedition.endsAt;
  game.UI.render();
  html = node("app").innerHTML;
  assert(html.includes("journey-item-progress is-complete") && html.includes("探索目標を達成") && html.includes("必要数に到達 · 今回 +2個"), "The live item target celebrates reaching its requested quantity on the return leg");
  assert(html.includes("target-item-acquired") && html.includes("battle-log-target-badge") && html.includes('data-action="open-item-codex" data-item="slime_gel"') && html.includes("探索目標"), "The exact loot entry that completes the tracked item target is highlighted and links to its field record");
  await click("open-item-codex", { item: "slime_gel" });
  html = node("app").innerHTML;
  assert(html.includes('data-item-codex="slime_gel"') && html.includes("is-focused-item") && html.includes("探索記録から表示") && html.includes("入手元を確認"), "A highlighted find opens its exact item record and acquisition sources");
  game.UI.navigate("party");
  await click("party-view", { view: "adventure" });
  const result = game.Dungeon.completeIfReady(now);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.trackedAchievementProgress)), { achievementId: "first_footprint", before: 0, after: 1, target: 1, complete: true }, "The return report records only the tracked achievement progress made during that expedition");
  assert(result && JSON.stringify(result.battleLog) === JSON.stringify(planned.battleLog), "Live preview and completed battle log must be identical");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result.partyReturnMoment)), JSON.parse(JSON.stringify(planned.partyReturnMoment)), "The journey-home conversation remains deterministic between preview and completion");
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
  assert(result.newSkillMasteries.length > 0 && result.newSkillMasteries.every(entry => entry.masteries.every(mastery => mastery.rankId === "familiar" && mastery.uses >= 10)), "Crossing a skill-use threshold creates a return-report mastery moment");
  const history = game.GameState.data.partyHistory[0][0];
  assert.deepStrictEqual(JSON.parse(JSON.stringify(history.trackedAchievementProgress)), { achievementId: "first_footprint", before: 0, after: 1, target: 1, complete: true }, "Tracked achievement progress remains attached to expedition history");
  assert(["first_travel_memory", "shared_travel_memory"].every(id => history.newAchievementIds.includes(id)), "New achievements remain attached to the expedition that earned them");
  assert.deepStrictEqual(Array.from(history.storyMoments, moment => moment.kind), ["discovery", "ending"], "Discovered and resolved story moments remain in expedition history while the next opening waits at home");
  assert(game.Story.pendingEpisode()?.entries.some(entry => entry.kind === "dungeonOpening" && entry.dungeon?.id === "whispering_brook"), "The next route opening is waiting in the home story reader");
  assert.deepStrictEqual(Array.from(history.partySetup, member => member.name), ["盾役", "術師", "癒し手"], "The expedition history keeps the adventurers who witnessed each story moment");
  assert.strictEqual(history.partySetup[0].reputation.title, "先陣", "The history keeps the reputation carried at departure");
  game.GameState.data.partyHistory[1].push(
    { id: "older-best-slime-gel", completedAt: now - 50000, dungeonId: history.dungeonId, difficultyId: history.difficultyId, timeMultiplier: history.timeMultiplier, success: true, equipment: [], materials: [{ itemId: "slime_gel", quantity: 7 }], partySetup: [{ name: "古い採取隊" }] },
    { id: "newer-slime-gel-a", completedAt: now - 2000, dungeonId: "meadow", difficultyId: "normal", timeMultiplier: 1, success: true, equipment: [], materials: [{ itemId: "slime_gel", quantity: 1 }], partySetup: [{ name: "採取隊A" }] },
    { id: "newer-slime-gel-b", completedAt: now - 1000, dungeonId: "meadow", difficultyId: "abyss", timeMultiplier: 3, success: true, equipment: [], materials: [{ itemId: "slime_gel", quantity: 2 }], partySetup: [{ name: "採取隊B" }] }
  );
  await click("open-item-codex", { item: "slime_gel" });
  html = node("app").innerHTML;
  assert(html.includes("item-return-history") && html.includes("最近の持ち帰り") && html.includes("item-return-best") && html.includes("BEST RETURN · 最高の持ち帰り") && html.includes("古い採取隊") && html.includes("<b>+7</b>") && html.includes('data-history="older-best-slime-gel"') && html.includes(`data-action="retrace-history-item" data-party="0" data-dungeon="${history.dungeonId}" data-difficulty="${history.difficultyId}" data-time="${history.timeMultiplier}" data-item="slime_gel" data-target="8"`) && html.includes("第1隊で8個へ") && html.includes(`data-action="open-item-history" data-party="0" data-history="${history.id}" data-item="slime_gel"`), "The item record keeps an older best haul accessible and lets an unlocked idle party challenge its route with a one-higher collection goal");
  assert(html.includes("item-route-records") && html.includes("探索条件ごとの記録") && html.includes("3通り") && html.includes("魔境の風鳴りの草原 · 3倍探索") && html.includes('data-difficulty="abyss" data-time="3" data-item="slime_gel" data-target="3"') && html.includes("3個へ"), "The item record compares best hauls by exact route, difficulty and duration, with a direct challenge for each record");
  await click("retrace-history-item", { party: "0", dungeon: history.dungeonId, difficulty: history.difficultyId, time: String(history.timeMultiplier), item: "slime_gel", target: "8" });
  assert.strictEqual(game.Party.selected(), 0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Party.plan(0))), { dungeonId: history.dungeonId, difficultyId: history.difficultyId, timeMultiplier: history.timeMultiplier }, "The best-haul shortcut restores its exact route on an available party when the record's party cannot be used");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Encyclopedia.trackedTarget())), { itemId: "slime_gel", quantity: 8, progress: 0 }, "The best-haul shortcut turns the previous record plus one into the next exploration goal");
  html = node("app").innerHTML;
  assert(html.includes("出撃先指定") && html.includes("探索目標") && html.includes(game.GameData.items.slime_gel.name) && html.includes("同じ条件で残した最高記録") && html.includes("古い採取隊") && html.includes("第2隊の記録") && html.includes('data-party="1" data-history="older-best-slime-gel"'), "The best-haul shortcut stops at departure review with its item goal and the other party's guild-wide route record visible");
  await click("open-item-codex", { item: "slime_gel" });
  html = node("app").innerHTML;
  await click("open-item-history", { party: "0", history: history.id, item: "slime_gel" });
  html = node("app").innerHTML;
  assert(html.includes(`data-history-id="${history.id}"`) && html.includes("品の図鑑から選択") && html.includes("party-history-item-focus") && html.includes(`${game.GameData.items.slime_gel.name}を`) && html.includes("個持ち帰った遠征"), "An item return opens and explains its exact retained expedition record");
  assert(html.includes('class="is-focused-loot"') && html.includes('data-action="open-item-codex" data-item="slime_gel"'), "The selected loot is highlighted and every retained item links back to its field record");
  game.GameState.data.partyHistory[1] = [];
  await click("retrace-history-item", { party: "0", dungeon: history.dungeonId, difficulty: history.difficultyId, time: String(history.timeMultiplier), item: "slime_gel" });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Party.plan(0))), { dungeonId: history.dungeonId, difficultyId: history.difficultyId, timeMultiplier: history.timeMultiplier }, "A remembered item restores the exact route that brought it home");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Encyclopedia.trackedTarget())), { itemId: "slime_gel", quantity: 1, progress: 0 }, "Retracing a remembered item begins a fresh one-item exploration goal");
  assert.strictEqual(game.Encyclopedia.trackedMonsterTarget(), null, "Retracing a remembered item leaves an earlier monster hunt behind");
  html = node("app").innerHTML;
  assert(html.includes("tracked-loot-guide") && html.includes("探索目標") && html.includes(game.GameData.items.slime_gel.name), "The retraced route opens departure preparation with its item goal visible");
  assert(html.includes("tracked-item-memory") && html.includes("同じ条件で残した最高記録") && html.includes("盾役・術師・癒し手") && html.includes("当時の3人全員が今回も同行") && html.includes(`data-action="open-item-history" data-party="0" data-history="${history.id}" data-item="slime_gel"`), "Departure preparation remembers the companions and highest loot record from the same route conditions");
  await click("open-item-codex", { item: "slime_gel" });
  html = node("app").innerHTML;
  assert(html.includes('data-item-codex="slime_gel"') && html.includes("is-focused-item"), "A retained loot row returns to the exact item record");
  game.UI.navigate("party");
  await click("party-view", { view: "results" });
  html = node("app").innerHTML;
  assert(html.includes("ADVENTURE LOG") && html.includes("探索の記録"));
  assert(html.includes("target-item-acquired") && html.includes("battle-log-target-badge"), "The completed journal preserves the highlighted target-item find");
  assert(html.includes("仲間内の呼び名") && html.includes("先陣の盾役"), "The completed journal preserves the departure reputation scene");
  assert(html.includes("JOURNEY DISCOVERY") && html.includes("道中で起きたこと") && html.includes(witnessedRouteDefinition.name) && html.includes(witnessedRouteEvent.routeEventSuccess ? "成功" : "失敗"), "The completed report surfaces its route-event outcome before the full journal");
  assert(html.includes("journey-route-tags") && html.includes(`journey-discovery ${witnessedRouteDefinition.kind} is-route-event`) && html.includes(`<small>${witnessedRouteDefinition.name}</small>`) && html.includes(witnessedRouteEvent.routeEventSuccess ? ">成功</b>" : ">失敗</b>"), "The full journal names the exact route scene and shows its observed outcome instead of only a broad event family");
  if (witnessedRouteEvent.routeRumorMatched) assert(html.includes(">噂と一致</b>"), "A route event matching the local rumor is marked directly in the full journal");
  assert(html.includes("TREASURE FOUND") && html.includes("個の宝箱を発見") && html.includes("開封") && ["古びた木箱", "鉄縁の宝箱", "星紋の宝箱"].some(name => html.includes(name)), "The return report summarizes chest rarity, opening outcome and contents before the full journal");
  assert(html.includes("SIGNATURE SKILL") && html.includes("使い込んだ技能に新しい呼び名") && html.includes("手慣れ"), "A newly earned skill mastery is celebrated before the detailed battle record");
  assert(html.includes("この場を歩いた冒険者") && html.includes("盾役・術師・癒し手"), "The completed journal keeps the same story witnesses");
  assert(html.includes("journey-conclusion") && html.includes("battle-log-list"));
  assert(html.includes("journey-companion-cast") && html.includes("ミナ") && html.includes("ティオ"), "The completed journal preserves the companion scene cast");
  assert(html.includes("NEW ACHIEVEMENT") && html.includes("旅の途中で") && html.includes("二人だけの歩幅") && html.includes("実績の記録を読む"), "Newly completed achievements are visible in the return report");
  assert(html.includes("TRACKED MILESTONE") && html.includes("目標「最初の足跡」を達成しました") && html.includes("0 → 1 / 1"), "The return report celebrates the exact progress made toward the achievement tracked at departure");
  assert(html.includes("achievement-unlock-list") && html.includes("調査・達成") && html.includes("同行者の知らなかった一面を記録する。") && html.includes("ACHIEVED") && html.includes("記念のギルド印章2個を受け取る"), "New achievements receive individual illustrated stamps, descriptions and their immediately claimable rewards");
  assert(html.includes("印章受領後の道筋") && html.includes("長い道の先へ"), "A tracked milestone reveals the next linked goal before its reward is claimed");
  const rewardSealsBefore = game.GameState.data.inventory.materials.guild_seal;
  await click("claim-achievement", { achievement: "first_travel_memory" });
  html = node("app").innerHTML;
  assert(game.GameState.data.inventory.materials.guild_seal === rewardSealsBefore + 2 && html.includes("✓ 記念の印章を受取済み"), "A newly revealed secret achievement reward can be claimed without leaving the return report");
  await click("claim-achievement", { achievement: "first_footprint" });
  html = node("app").innerHTML;
  assert(game.Achievements.tracked().id === "long_road" && html.includes("次の目標を追跡中") && html.includes("長い道の先へ"), "Claiming the tracked milestone keeps its successor visible in the return report");
  assert(html.includes("ON THE WAY HOME") && html.includes("帰路のひと幕") && html.includes(result.partyReturnMoment.text), "The return report surfaces a success-or-retreat-specific exchange without requiring the full battle log");
  assert(html.includes("NEW PERSONAL RECORD") && html.includes("初陣の記章") && html.includes("足跡を見る"), "New personal medals are visible in the return report");
  assert(html.includes("PERSONAL BEST") && html.includes("自身の遠征記録を更新") && html.includes("→"), "Personal-best improvements are visible in the return report");
  assert(html.includes("TRAVELER'S RUMOR") && html.includes("を確かめました"), "The return report recalls the traveler rumor attached at departure");
  assert(html.includes("NEW TRAVEL MEMORY") && html.includes("機械の迷い") && html.includes("ミナ・ティオ") && html.includes("人物録で読み返す"), "A newly witnessed travel memory is called out before the full log");
  assert(html.includes("battle-observation-summary") && html.includes("観測要点") && html.includes("命中・回避"), "Completed encounters summarize observable combat evidence before the full log");
  assert(!html.includes("戦闘ログを見る"), "Battle logs should be nested in encounter entries instead of a separate panel");
  await click("open-achievements");
  assert(node("app").innerHTML.includes("実績の記録") && node("app").innerHTML.includes("旅の途中で"), "The return report opens the achievement ledger directly");
  assert(node("app").innerHTML.includes("achievement-provenance") && node("app").innerHTML.includes("への遠征で達成") && node("app").innerHTML.includes("達成隊：盾役、術師、癒し手") && node("app").innerHTML.includes("履歴へ"), "The ledger connects a completed achievement to the retained expedition and companions that earned it");
  await click("open-achievement-history", { party: "0", history: history.id });
  assert(node("app").innerHTML.includes("遠征履歴") && node("app").innerHTML.includes("実績の記録から選択") && node("app").innerHTML.includes("遠征で刻まれた実績"), "Achievement provenance opens the exact retained expedition record");
  game.UI.navigate("party");
  await click("party-open", { party: "0", view: "history" });
  html = node("app").innerHTML;
  assert(html.includes("遠征時の隊の空気") && html.includes("撹乱役 × 先陣") && html.includes("合図で守りを崩す") && html.includes("party-history-reputation") && html.includes("先陣"), "Expedition history preserves the atmosphere and reputations actually carried at departure");
  assert(html.includes("party-history-return-mood") && html.includes("帰路のひと幕") && html.includes(result.partyReturnMoment.text), "Expedition history preserves the pair's journey-home exchange with that specific result");
  assert(html.includes("遠征で刻まれた実績") && html.includes("旅の途中で") && html.includes("二人だけの歩幅"), "Expedition history preserves achievement moments after the latest report is replaced");
  assert(html.includes("追っていた実績") && html.includes("最初の足跡") && html.includes("0 → 1 / 1"), "Expedition history preserves the tracked milestone even after leaving the return report");
  console.log("Expedition log test passed: deterministic live reveal, story discoveries, arrival/search/treasure/stairs rows, nested encounter battles and completed journal reuse");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
