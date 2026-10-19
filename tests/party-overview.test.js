const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
let now = 1700000000000, tick;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: handler => { tick = handler; return 0; },
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
function row(index) {
  const match = html().match(new RegExp('<article class="party-overview-row[^>]*data-party-overview="' + index + '"[\\s\\S]*?</article>'));
  assert(match, "Every party has an overview row"); return match[0];
}
document.querySelectorAll = selector => {
  if (selector === "[data-countdown]") return [0, 1].filter(index => html().includes('data-countdown="' + index + '"')).map(index => {
    const timer = node("timer-" + index); timer.dataset = { countdown: String(index) }; return timer;
  });
  if (selector === "[data-expedition]") return [0, 1].filter(index => html().includes('data-expedition="' + index + '"')).map(index => {
    const expedition = node("expedition-" + index); expedition.dataset = { expedition: String(index) };
    expedition.querySelector = key => {
      if (key === "[data-overview-percent]") return node("percent-" + index);
      const progress = node("progress-" + index); progress.style = progress.style || {}; return progress;
    };
    return expedition;
  });
  return [];
};
async function run() {
  game.UI.init(); game.UI.navigate("party");
  const styles = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
  const familiarityPanel = game.GameUIViews.results.destinationFamiliarityPanel({ dungeonId: "meadow", difficultyId: "normal", newDestinationFamiliarities: [{ characterId: "route-test", name: "ミチル", clears: 3, tierId: "seasoned_route", tierLabel: "歩き慣れた", nextTierLabel: "案内役", clearsUntilNext: 7 }] }, { escape: value => String(value) });
  assert(familiarityPanel.includes("ミチル · 歩き慣れた") && familiarityPanel.includes("分かれ道ごとの風向き") && familiarityPanel.includes('data-action="open-adventurer-record"'), "A return makes personal route-familiarity growth visible and links to the adventurer's footsteps");
  assert(styles.includes(".party-overview .fleet-state-filters { position: sticky; top: 0;"), "Party status filters remain reachable while scrolling the mobile overview");
  assert(row(0).includes("未編成") && row(1).includes("未解放"));
  assert(row(0).includes('data-action="rename-party" data-party="0"') && !row(0).includes('class="fleet-party-select" data-action="party-open"'), "Tapping the overview party name opens rename rather than formation");
  assert(!html().includes('data-party-overview="2"') && html().includes("さらに6枠のパーティを増設できます"), "Only the next locked slot is shown to keep the initial list compact");
  assert(!row(1).includes("data-action"), "Locked party cannot be opened");
  const a = require("./helpers").createCharacter(game, "鉱石収集隊").id;
  const b = require("./helpers").createCharacter(game, "洞窟攻略隊", "mage").id;
  game.Characters.get(a).level = 30; game.Characters.get(b).level = 30;
  Object.keys(game.Characters.get(a).attributes).forEach(key => { game.Characters.get(a).attributes[key] = 999; });
  Object.keys(game.Characters.get(b).attributes).forEach(key => { game.Characters.get(b).attributes[key] = 999; });
  require("./helpers").completeThrough(game, "seal");
  game.GameState.data.unlockedPartyCount = 2;
  game.Party.toggle(a, 0); game.Party.toggle(b, 1);
  assert(game.Presets.save(0, "採掘隊", 0).ok);
  assert((await game.GameClient.execute("party.setPlan", { dungeonId: "meadow", difficultyId: "normal", timeMultiplier: 1, partyIndex: 0 })).ok);
  assert((await game.GameClient.execute("party.setPlan", { dungeonId: "cave", difficultyId: "normal", timeMultiplier: 1, partyIndex: 1 })).ok);
  game.Items.add("iron_ore", 1);
  game.Encyclopedia.setTrackedItem("iron_ore", 5);
  game.Encyclopedia.recordTargetProgress("iron_ore", 2);
  assert(game.Achievements.track("hundred_hunt").ok);
  game.UI.render();
  assert(html().includes("fleet-target-strip achievement-target") && html().includes("現在の実績目標") && html().includes("百体討伐") && html().includes("挑戦可能な候補") && html().includes('data-action="open-target-destination"'), "The party overview keeps the tracked guild milestone and matching expedition routes visible");
  assert(html().includes('data-action="open-monster-codex">魔物図鑑を見る</button>'), "The tracked milestone also links directly to the screen where its broader progress can be inspected");
  const achievementRoute = game.Achievements.expeditionCandidates(game.Achievements.tracked())[0];
  const secondPlan = JSON.parse(JSON.stringify(game.Party.plan(1)));
  game.GameState.data.partyPlans[1] = null;
  assert(achievementRoute && (await game.GameClient.execute("party.setPlan", { dungeonId: achievementRoute.dungeonId, difficultyId: achievementRoute.difficultyId, timeMultiplier: 1, partyIndex: 0 })).ok);
  game.UI.render();
  assert(html().includes("出発待ち 1隊") && row(0).includes("次の出撃で実績候補へ") && !row(1).includes("次の出撃で実績候補へ"), "The overview identifies exactly which waiting party is assigned to a tracked achievement route");
  assert((await game.GameClient.execute("party.setPlan", { dungeonId: "meadow", difficultyId: "normal", timeMultiplier: 1, partyIndex: 0 })).ok);
  assert((await game.GameClient.execute("party.setPlan", { ...secondPlan, partyIndex: 1 })).ok);
  game.UI.render();
  assert(row(0).includes(`>${1}/${game.Party.memberLimit()}人</span><span>空き${game.Party.memberLimit() - 1}</span>`) && row(1).includes(`>${1}/${game.Party.memberLimit()}人</span><span>空き${game.Party.memberLimit() - 1}</span>`), "Party rows show remaining member capacity as compact chips");
  assert(row(0).includes('class="fleet-party-meta"'), "Party facts use a compact horizontal strip instead of a truncated sentence");
  assert(row(0).includes(`戦力 ${Math.round(game.Party.power(0)).toLocaleString("ja-JP")}`) && row(1).includes(`戦力 ${Math.round(game.Party.power(1)).toLocaleString("ja-JP")}`), "Each party row shows its current factual power value");
  assert(row(0).includes('保存「採掘隊」') && row(0).includes('data-action="open-party-presets" data-party="0"') && !row(1).includes("保存「"), "Only the matching party shows a direct link to its saved preset");
  game.GameState.data.adventurerBonds.pairs[[a, b].sort().join("::")] = 5;
  game.Party.toggle(b, 1); game.Party.toggle(b, 0); game.UI.render();
  assert(row(0).includes('class="fleet-bond-status"') && row(0).includes("旅仲間 1組") && row(0).includes("合図の通る間合い"), "The overview shows a compact in-world marker when adjacent companions can coordinate");
  game.Party.toggle(b, 0); game.Party.toggle(b, 1); game.UI.render();
  assert(!row(0).includes("fleet-bond-status") && !row(1).includes("fleet-bond-status"), "Relationships do not imply formation support when companions are assigned to different parties");
  assert(html().includes('data-action="party-overview-filter" data-filter="exploring"') && html().includes("待機中 2"), "The overview exposes compact state filters with counts");
  await click("party-overview-filter", { filter: "exploring" });
  assert(!html().includes('data-party-overview="0"') && html().includes("該当するパーティはありません"), "An empty state filter gives a clear result");
  const savedFirstPlan = game.GameState.data.partyPlans[0];
  game.GameState.data.partyPlans[0] = null;
  game.UI.render();
  await click("party-overview-filter", { filter: "waiting" });
  assert(row(0).includes("鉱石収集隊") && row(1).includes("洞窟攻略隊"), "Waiting filter keeps only non-exploring parties");
  assert(html().indexOf('data-party-overview="1"') < html().indexOf('data-party-overview="0"'), "Waiting parties that can depart are listed before parties missing a destination");
  game.GameState.data.partyPlans[0] = savedFirstPlan;
  game.UI.render();
  await click("party-overview-filter", { filter: "all" });
  game.Characters.setActionRates(a, { attack: 90, technique: 100, spell: 100, healing: 100 }); game.UI.render();
  assert(row(0).includes('fleet-preset-link is-changed') && row(0).includes('保存「採掘隊」と差あり'), "A factual drift marker links to the preset when the same lineup changes equipment or action rates");
  game.Characters.setActionRates(a, { attack: 100, technique: 100, spell: 100, healing: 100 }); game.UI.render();
  assert(html().includes("fleet-target-strip") && html().includes("現在の探索目標") && html().includes("鉄鉱石") && html().includes("収集中 2/5") && /入手記録のある探索地 [1-9]\d*か所/.test(html()), "The party overview summarizes the global collection target and available recorded destinations");
  assert(html().includes('data-action="open-target-recipes"') && html().includes(">関連レシピ</button>"), "A material target links back to unlocked recipes that use it");
  const targetRecipeIds = (html().match(/data-action="open-target-recipes" data-recipes="([^"]+)"/) || [])[1];
  assert(targetRecipeIds);
  await click("open-target-recipes", { recipes: targetRecipeIds });
  assert(html().includes("探索目標に関係する") && html().includes("集めた素材を使う、解放済みの製作記録です。") && html().includes("recipe-focus-summary") && html().includes("製作可能") && html().includes("素材・資金不足"));
  game.UI.navigate("party");
  game.GameState.data.encyclopedia.craftingTargetId = "forge_iron_sword";
  game.UI.render();
  const persistentCraftPlan = game.Blacksmith.craftingPlan("forge_iron_sword");
  const persistentCraftItem = game.GameData.items[persistentCraftPlan.resultId];
  const persistentCraftSummary = persistentCraftPlan.ready ? "素材と工賃が揃っています" : `素材 ${persistentCraftPlan.materialMet}/${persistentCraftPlan.totalMaterials}種`;
  assert(html().includes("fleet-target-strip crafting-target") && html().includes("現在の製作目標") && html().includes(persistentCraftItem.name) && html().includes(persistentCraftSummary) && html().includes('data-action="clear-crafting-recipe"'), "The party overview keeps a selected crafting project and its full checklist visible outside the forge");
  if (persistentCraftPlan.nextNeed) {
    const nextMaterial = game.GameData.items[persistentCraftPlan.nextNeed.itemId];
    assert(html().includes(`${nextMaterial.name} <b>${persistentCraftPlan.nextNeed.owned}/${persistentCraftPlan.nextNeed.required}</b>`) && html().includes(`data-action="track-recipe-material" data-item="${nextMaterial.id}" data-target-quantity="${persistentCraftPlan.nextNeed.missing}"`), "The crafting project offers its most important missing material as the next direct action");
  }
  await click("clear-crafting-recipe");
  assert.strictEqual(game.Encyclopedia.craftingTarget(), null);
  game.Encyclopedia.recordTargetProgress("iron_ore", 3);
  game.UI.render();
  const overviewCraftPlan = game.Blacksmith.relatedMaterialPlan("iron_ore");
  const overviewCraftItem = game.GameData.items[overviewCraftPlan.resultId];
  assert(html().includes("達成 5/5") && html().includes(">製作へ</button>") && html().includes('data-action="track-item" data-item="iron_ore" data-target-quantity="10"') && html().includes("さらに5個集める") && html().includes("製作への次の一手") && html().includes(overviewCraftItem.name), "A completed material target promotes a related crafting path and a one-tap repeat of the same collection batch");
  if (overviewCraftPlan.nextNeed) assert(html().includes(`data-action="track-recipe-material" data-item="${overviewCraftPlan.nextNeed.itemId}" data-target-quantity="${overviewCraftPlan.nextNeed.missing}"`) && html().includes("次の素材へ"), "The party overview keeps the next missing recipe material available after closing the return report");
  assert(html().includes('data-action="open-target-destination"') && html().includes('data-dungeon="cave"') && html().includes('data-action="open-item-codex">図鑑で変更'), "Known target sources link directly to the departure screen");
  const planBeforeChoice = JSON.parse(JSON.stringify(game.Party.plan(0)));
  const chooserHistory = game.GameState.data.partyHistory[1];
  game.GameState.data.partyHistory[1] = [{ id: "route-choice-history", dungeonId: "cave", difficultyId: "normal", success: true, completedAt: now - 1, partySetup: [{ id: b, name: "洞窟攻略隊" }], battle: { members: [{ id: b, name: "洞窟攻略隊" }] } }];
  await click("open-target-destination", { dungeon: "cave", difficulty: "normal" });
  assert(node("modal-root").innerHTML.includes("target-party-list") && node("modal-root").innerHTML.includes("第1パーティ") && node("modal-root").innerHTML.includes("第2パーティ"), "Multiple idle parties require an explicit choice");
  assert(node("modal-root").innerHTML.includes("推奨Lv.7") && (node("modal-root").innerHTML.match(/平均Lv\.30/g) || []).length === 2 && node("modal-root").innerHTML.includes("推奨Lv達成"), "The target chooser compares each waiting party's average level with the destination before changing its plan");
  assert(node("modal-root").innerHTML.includes("攻略経験者 1/1人") && node("modal-root").innerHTML.includes("この土地は全員未経験"), "The target chooser carries each current member's route history across party slots and distinguishes an inexperienced team");
  assert(node("modal-root").innerHTML.indexOf("第2パーティ") < node("modal-root").innerHTML.indexOf("第1パーティ"), "A waiting party with successful current-member experience is suggested before an inexperienced party");
  game.GameState.data.partyHistory[1] = chooserHistory;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Party.plan(0))), planBeforeChoice, "Opening the party chooser does not overwrite a saved plan");
  await click("confirm-target-destination", { party: "0", dungeon: "cave", difficulty: "normal" });
  assert.strictEqual(game.Party.selected(), 0);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Party.plan(0))), { dungeonId: "cave", difficultyId: "normal", timeMultiplier: 1 });
  assert.strictEqual(game.GameState.data.expeditions[0], null, "Opening a target source never starts the expedition automatically");
  assert(html().includes("DEPARTURE PARTY") && html().includes(game.GameData.dungeons.cave.name));
  const selectedHistory = game.GameState.data.partyHistory[0];
  game.GameState.data.partyHistory[0] = [
    { id: "retry-preview-2", dungeonId: "cave", difficultyId: "normal", success: false, completedAt: now - 1 },
    { id: "retry-preview-1", dungeonId: "cave", difficultyId: "normal", success: false, completedAt: now - 2 }
  ];
  game.UI.render();
  assert(html().includes("dungeon-retry-preparation") && html().includes("再挑戦の備え · 撤退記録2回 · 戦闘被ダメージ-6%"), "The departure list previews the exact-route help earned through recent retreats");
  game.GameState.data.partyHistory[0] = Array.from({ length: 10 }, (_, index) => ({ id: `current-route-memory-${index}`, dungeonId: "cave", difficultyId: "normal", success: true, completedAt: now - index, partySetup: [{ id: a, name: "鉱石収集隊" }], battle: { members: [{ id: a, name: "鉱石収集隊" }] } }));
  game.UI.render();
  const routeMemory = game.Party.routeExperience("cave", "normal", 0);
  assert(routeMemory.successful === 1 && routeMemory.successfulNames[0] === "鉱石収集隊" && routeMemory.successfulClearCounts[a] === 10 && routeMemory.strongestFamiliarityLabel === "案内役" && routeMemory.successChanceBonus === .03 && html().includes("dungeon-route-experience is-success") && html().includes("現編成・攻略経験 1/1人・案内役"), "Repeated clears promote an adventurer from route familiarity to a visible destination-guide tier with a stronger bounded bonus");
  game.Party.toggle(b, 1); game.Party.toggle(b, 0); game.UI.render();
  const mentorshipPreview = game.Party.routeExperience("cave", "normal", 0).mentorship;
  assert(mentorshipPreview?.mentorId === a && mentorshipPreview.apprenticeIds.includes(b) && html().includes("dungeon-route-mentorship") && html().includes("案内役 鉱石収集隊 → 初見 洞窟攻略隊"), "Departure preparation previews exactly which established guide will teach an unfamiliar party member");
  game.Characters.recordRouteMentorship(game.Characters.get(a), { role: "mentor", partnerCharacterId: b, dungeonId: "cave", difficultyId: "normal", completedAt: now });
  game.Characters.recordRouteMentorship(game.Characters.get(b), { role: "apprentice", partnerCharacterId: a, dungeonId: "cave", difficultyId: "normal", completedAt: now });
  game.UI.render();
  const reunionPreview = game.Party.routeExperience("cave", "normal", 0).reunions[0];
  assert(reunionPreview?.mentorId === a && reunionPreview.apprenticeId === b && html().includes("dungeon-route-reunion") && html().includes("再訪 鉱石収集隊 ↔ 洞窟攻略隊"), "Departure preparation previews when a mentor and apprentice are returning to the exact route they share");
  const inheritedGuidePanel = game.GameUIViews.results.destinationFamiliarityPanel({
    dungeonId: "cave", difficultyId: "normal",
    newDestinationFamiliarities: [{ characterId: b, name: "洞窟攻略隊", dungeonId: "cave", difficultyId: "normal", clears: 10, tierId: "route_guide", tierLabel: "案内役", previousTierId: "seasoned_route", previousTierLabel: "歩き慣れた", nextTierId: null, nextTierLabel: null, clearsUntilNext: 0, successChanceBonus: .03 }]
  }, { escape: value => String(value) });
  assert(inheritedGuidePanel.includes("ROUTE INHERITED") && inheritedGuidePanel.includes("教わった帰り道が、次へ渡せる知恵になりました") && inheritedGuidePanel.includes("洞窟攻略隊 · 継承案内役") && inheritedGuidePanel.includes("鉱石収集隊から教わった帰り道を、今度は誰かへ渡せる"), "Reaching guide rank after mentorship should be celebrated as an inherited route rather than generic familiarity growth");
  assert(styles.includes(".result-destination-familiarities.has-inherited-guide") && styles.includes("article.is-inherited-guide"), "An inherited guide milestone has a distinct but compact return-report treatment");
  const c = require("./helpers").createCharacter(game, "地図を読む新人", "ranger").id;
  game.Characters.get(c).level = 30;
  game.Party.toggle(c, 0);
  game.GameState.data.partyHistory[0] = Array.from({ length: 10 }, (_, index) => ({ id: `inherited-route-memory-${index}`, dungeonId: "cave", difficultyId: "normal", success: true, completedAt: now - index, partySetup: [{ id: a, name: "鉱石収集隊" }, { id: b, name: "洞窟攻略隊" }], battle: { members: [{ id: a, name: "鉱石収集隊" }, { id: b, name: "洞窟攻略隊" }] } }));
  game.UI.render();
  const inheritedMentorship = game.Party.routeExperience("cave", "normal", 0).mentorship;
  assert(inheritedMentorship?.mentorId === b && inheritedMentorship.inheritedGuide && inheritedMentorship.lineageSupport && inheritedMentorship.lineagePredecessorId === a && inheritedMentorship.apprenticeIds.includes(c) && inheritedMentorship.successChanceBonus === .04, "A learned guide becomes stronger when the original teacher helps pass the exact route to a newcomer");
  assert(html().includes("三代の道継ぎ 鉱石収集隊 → 洞窟攻略隊 → 初見 地図を読む新人") && html().includes("dungeon-route-mentorship is-inherited-guide is-route-lineage"), "Departure preparation makes a three-generation route party visible before it leaves");
  game.Characters.recordRouteMentorship(game.Characters.get(b), { role: "mentor", partnerCharacterId: c, dungeonId: "cave", difficultyId: "normal", completedAt: now + 1 });
  game.Characters.recordRouteMentorship(game.Characters.get(c), { role: "apprentice", partnerCharacterId: b, dungeonId: "cave", difficultyId: "normal", completedAt: now + 1 });
  const lineagePanel = game.GameUIViews.results.routeLineagePanel({ newDestinationFamiliarities: [{ characterId: c, mentorCharacterId: b, dungeonId: "cave", difficultyId: "normal" }] }, { escape: value => String(value) });
  assert(lineagePanel.includes("帰り道が、三人目へ渡りました") && lineagePanel.includes("鉱石収集隊") && lineagePanel.includes("洞窟攻略隊") && lineagePanel.includes("地図を読む新人") && lineagePanel.includes(`data-character="${b}"`), "The first inherited teaching return turns three exact-route adventurers into a readable lineage scene linked to its central guide");
  const routeLineages = game.GameUIViews.results.routeLineages({ newDestinationFamiliarities: [{ characterId: c, mentorCharacterId: b, dungeonId: "cave", difficultyId: "normal" }] });
  assert(routeLineages.length === 1 && routeLineages[0].predecessor.id === a && routeLineages[0].mentor.id === b && routeLineages[0].apprentice.id === c, "The route-lineage derivation is reusable by current results and archived expedition history");
  game.GameState.data.partyHistory[0] = [{
    id: "route-lineage-history", dungeonId: "cave", difficultyId: "normal", success: true, completedAt: now + 2, timeMultiplier: 1, gold: 0, exp: 0,
    equipment: [], materials: [], partySetup: [],
    battle: null, retryPreparation: { failures: 2, damageReduction: .06 }, retryPreparationGrowth: { previousFailures: 2, failures: 3, damageReduction: .09, atMaximum: true },
    routeEvents: [{ id: "hidden_passage", kind: "secret", success: true, mentorshipApplied: true, mentorshipInherited: true, lineageSupportApplied: true, lineagePredecessorName: "鉱石収集隊", mentorName: "洞窟攻略隊", apprenticeNames: ["地図を読む新人"], traditionApplied: true, traditionFounderNames: ["最初の案内役", "道を継いだ案内役", "三人目の新人"], text: "三人が一つの帰り道を確かめた。" }],
    newDestinationFamiliarities: [{ characterId: c, mentorCharacterId: b, dungeonId: "cave", difficultyId: "normal", name: "地図を読む新人", clears: 1, tierId: "first_steps", tierLabel: "足跡", clearsUntilNext: 2 }]
  }];
  const routeLineageHistory = game.GameUIViews.party.history({ escape: value => String(value), formatGold: value => `${value}G`, historyFocus: null });
  assert(routeLineageHistory.includes("party-history-route-lineage") && routeLineageHistory.includes("帰り道の系譜") && routeLineageHistory.includes("鉱石収集隊 → 洞窟攻略隊 → 地図を読む新人") && routeLineageHistory.includes("三代の道継ぎ") && routeLineageHistory.includes("最初の案内役：鉱石収集隊") && routeLineageHistory.includes("道を残した三人：最初の案内役、道を継いだ案内役、三人目の新人") && routeLineageHistory.includes(`data-character="${b}"`), "An inherited teaching scene, its three-generation support and the route founders remain readable in expedition history after the current result changes");
  assert(routeLineageHistory.includes("party-history-retry-preparation") && routeLineageHistory.includes("2度の撤退記録を活用") && routeLineageHistory.includes("被ダメージを6%抑えた") && routeLineageHistory.includes("次回の備えは3度・被ダメージ-9%"), "An old expedition preserves both the preparation it used and the stronger preparation its defeat left behind");
  game.Party.toggle(c, 0);
  game.Party.toggle(b, 0); game.Party.toggle(b, 1);
  game.GameState.data.partyHistory[0] = selectedHistory;
  game.UI.render();
  await click("party-back");
  assert(row(1).includes('class="fleet-lineage-status "') && row(1).includes("継承修行 洞窟攻略隊 0/10") && row(1).includes("師 鉱石収集隊／案内役まであと10回"), "The party overview keeps an exact-route apprentice's next guide milestone visible after leaving departure setup");
  game.Items.add("sticky_fluid", 1);
  game.Encyclopedia.recordBattle({ slime: 1 }, { slime: 1 }, { slime: { incomingAttempts: 1, incomingHits: 1, drops: ["sticky_fluid"] } }, "normal", { dungeonId: "meadow" });
  game.Encyclopedia.recordBattle({ slime: 1 }, {}, { slime: { incomingAttempts: 1, incomingHits: 1 } }, "abyss", { dungeonId: "meadow" });
  game.Encyclopedia.setTrackedMonster("slime", 10);
  game.Encyclopedia.recordMonsterTargetProgress("slime", 3);
  assert(game.Encyclopedia.setTrackedHarvest("sticky_fluid", "slime").ok);
  game.UI.render();
  assert(html().includes("fleet-target-strip harvest-target") && html().includes("狙い採りの記録") && html().includes("スライム") && html().includes("ねばねばした液体") && html().includes("品 0/1") && html().includes("討伐 3/10体"), "A confirmed fixed-drop pair becomes one compact collection and hunt strip");
  assert(html().includes('data-action="open-target-destination" data-dungeon="meadow" data-difficulty="normal"') && !html().includes('data-action="open-target-destination" data-dungeon="meadow" data-difficulty="abyss"'), "A paired target only suggests difficulties where the exact fixed drop was observed");
  assert(html().includes('data-action="open-item-codex">品の図鑑') && html().includes('data-action="open-monster-codex">魔物図鑑') && !html().includes("現在の探索目標") && !html().includes("現在の討伐目標"), "The combined strip keeps both codex paths without duplicating vertical target cards");
  game.Encyclopedia.setTrackedItem(null);
  game.UI.render();
  assert(html().includes("現在の討伐目標") && html().includes("スライム") && html().includes("追跡中 3/10体") && /生息地 [1-9]\d*か所／確認難度 2種/.test(html()), "The party overview keeps the active monster hunt visible with known habitats and observed difficulties");
  assert(html().includes('data-action="open-target-destination" data-dungeon="meadow" data-difficulty="normal"') && html().includes('data-action="open-target-destination" data-dungeon="meadow" data-difficulty="abyss"') && html().includes("魔境の風鳴りの草原") && html().includes('data-action="open-monster-codex">図鑑で変更'), "A monster hunt links directly to each observed and unlocked habitat difficulty and back to the monster codex");
  game.Encyclopedia.recordBattle({ slime: 9 }, { slime: 9 }, { slime: { incomingAttempts: 9, incomingHits: 9 } }, "normal", { dungeonId: "meadow" });
  game.Encyclopedia.recordMonsterTargetProgress("slime", 7);
  game.UI.render();
  assert(html().includes("達成 10/10体") && html().includes("次の節目へ・あと20体") && html().includes('data-target-quantity="30"'), "A completed hunt can be extended to the next milestone without leaving the party overview");
  await click("track-monster", { monster: "slime", targetQuantity: "30" });
  assert.strictEqual(game.Encyclopedia.trackedMonsterTarget().progress, 10);
  assert.strictEqual(game.Encyclopedia.trackedMonsterTarget().quantity, 30, "Extending a hunt preserves completed progress");
  await click("open-monster-codex");
  assert(html().includes("モンスター図鑑") && html().includes("現在の討伐目標"), "The hunt strip returns directly to the monster codex");
  game.UI.navigate("party");
  assert((await game.GameClient.execute("party.setPlan", { dungeonId: "meadow", difficultyId: "normal", timeMultiplier: 1, partyIndex: 0 })).ok);
  game.UI.render();
  assert(html().includes("出発待ち 1隊") && row(0).includes("次の出撃で討伐地へ") && !row(1).includes("次の出撃で討伐地へ"), "The overview identifies exactly which waiting party is assigned to a hunt habitat");
  assert(html().includes("待機隊を一斉出撃 (2)"));
  await click("depart-ready-parties");
  assert(game.GameState.data.expeditions.slice(0, 2).every(Boolean), "Manual batch departure starts every ready party with a saved plan");
  assert(html().includes("2/2隊が探索中"));
  assert(html().includes("追跡中 1隊") && row(0).includes("討伐目標を追跡中") && !row(1).includes("討伐目標を追跡中"), "Only the party exploring a known habitat is marked as actively pursuing the hunt");
  const originalFirstEnd = game.GameState.data.expeditions[0].endsAt;
  game.GameState.data.expeditions[0].endsAt = game.GameState.data.expeditions[1].endsAt + 1000;
  game.UI.render();
  await click("party-overview-filter", { filter: "exploring" });
  assert(html().indexOf('data-party-overview="1"') < html().indexOf('data-party-overview="0"'), "Exploring parties are ordered by the next return time");
  game.GameState.data.expeditions[0].endsAt = originalFirstEnd;
  game.UI.render();
  await click("party-overview-filter", { filter: "all" });
  assert(row(0).includes("草原") && row(0).includes("鉱石収集隊") && row(0).includes('data-countdown="0"'));
  assert(row(1).includes("洞窟") && row(1).includes("洞窟攻略隊") && row(1).includes('data-countdown="1"'));
  assert(row(1).includes('class="fleet-lineage-status is-active"') && row(1).includes("継承修行 洞窟攻略隊 0/10"), "An active expedition keeps its route-inheritance training goal visible without opening the log");
  assert(!html().includes("expedition-banner"), "Do not duplicate the selected party banner");
  now += 15000; await tick();
  assert.strictEqual(node("timer-0").textContent, "00:15"); assert.strictEqual(node("timer-1").textContent, "00:45");
  assert.strictEqual(node("progress-0").style.width, "50%"); assert.strictEqual(node("progress-1").style.width, "25%");
  assert.strictEqual(node("percent-0").textContent, 50); assert.strictEqual(node("percent-1").textContent, 25);
  await click("party-open", { party: "1", view: "adventure" });
  assert.strictEqual(game.Party.selected(), 1); assert(html().includes("PARTY 2") && html().includes("DEPARTURE PARTY") && !html().includes("PARTY STATUS"));
  const openJournalBeforeReturn = html();
  now += 15000; await tick();
  assert.strictEqual(html(), openJournalBeforeReturn, "A background return does not replace a battle or exploration log being read");
  assert(node("main-nav").innerHTML.includes("nav-notice party"), "The navigation announces the return without replacing the open page");
  await click("party-back");
  assert(row(0).includes("攻略成功") && row(0).includes("is-last-success") && row(0).includes(game.GameData.dungeons.meadow.name));
  game.GameState.data.partyResults[0].storyMoments = [];
  game.GameState.data.partyResults[0].storyCompleted = [];
  game.UI.render();
  assert(row(0).includes('class="difficulty-next-route"') && row(0).includes('data-action="continue-difficulty-route"') && row(0).includes('data-difficulty="abyss"') && row(0).includes("次の難度 魔境"), "A cleared route advertises its newly unlocked harder tier from the party overview");
  await click("continue-difficulty-route", { party: "0", dungeon: "meadow", difficulty: "abyss" });
  assert.strictEqual(game.Party.plan(0).difficultyId, "abyss", "The harder-tier shortcut saves that difficulty to the returning party");
  assert(html().includes("魔境の風鳴りの草原") && !game.GameState.data.expeditions[0], "The shortcut opens departure review without automatically starting an expedition");
  assert((await game.GameClient.execute("party.setPlan", { dungeonId: "meadow", difficultyId: "normal", timeMultiplier: 1, partyIndex: 0 })).ok);
  await click("party-back");
  assert((await game.GameClient.execute("party.select", { partyIndex: 1 })).ok);
  game.UI.render();
  assert(row(0).includes("has-unread-result") && row(0).includes("直近ログ・新着") && node("main-nav").innerHTML.includes("nav-notice party"));
  assert(node("main-nav").innerHTML.includes('aria-label="パーティ・未読の探索結果1件"'), "The party tab announces its unread count without duplicating the tab name");
  assert(html().includes('data-filter="reports"') && html().includes('aria-label="未読1件">新1</i>'), "The report filter shows its unread count separately from the total report count");
  game.GameState.data.partyResults[1] = Object.assign({}, game.GameState.data.partyResults[0], { id: "unread-while-exploring", partyIndex: 1 });
  game.UI.render();
  assert(row(1).includes("探索中") && row(1).includes("has-unread-result") && row(1).includes("直近ログ・新着"), "Starting another expedition does not hide an unread return report");
  game.GameState.data.partyResults[1] = null;
  game.UI.render();
  const resultLootInstance = game.Items.equipmentList().find(item => item.templateId === "wooden_sword");
  assert(resultLootInstance, "The starter sword is available for the retained-loot navigation test");
  const resultLootName = game.Items.displayName(resultLootInstance);
  game.GameState.data.partyResults[0].drops = [
    { itemId: "wooden_sword", quantity: 1, instanceId: resultLootInstance.id, displayName: resultLootName, qualityId: resultLootInstance.qualityId, newDiscovery: true },
    { itemId: "cloth_clothes", quantity: 1, displayName: "上質な布の服", qualityId: "fine", newBest: true },
    { itemId: "iron_sword", quantity: 1, displayName: "★天地を砕く 鉄の剣", qualityId: "standard", ultraRareTitleId: "worldbreaker", newUltraRareTitle: true },
    { itemId: "iron_ore", quantity: 3 },
    { itemId: "magic_stone", quantity: 2 },
    { itemId: "craft_material", quantity: 4 }
  ];
  game.GameState.data.partyResults[0].newItemIds = ["wooden_sword"];
  game.GameState.data.partyResults[0].storyMoments = [{ kind: "discovery", dungeonId: "meadow", sceneId: "meadow_discovery" }];
  game.GameState.data.partyResults[0].newSetDiscoveries = [{ setId: "windtrail_craft", previousCount: 1, count: 2, newBonusSkillIds: ["set_windtrail_2"], complete: false }];
  game.GameState.data.partyResults[0].newBestQualities = [{ itemId: "cloth_clothes", qualityId: "fine" }];
  game.GameState.data.partyResults[0].newUltraRareTitleIds = ["worldbreaker"];
  game.GameState.data.partyResults[0].newMonsterInsights = [];
  game.GameState.data.partyResults[0].trackedItemId = "iron_ore";
  game.GameState.data.partyResults[0].trackedItemQuantity = 3;
  game.GameState.data.partyResults[0].trackedItemGoal = 10;
  game.GameState.data.partyResults[0].trackedItemProgress = 3;
  game.GameState.data.partyResults[0].companionAdvancements = [{ companionId: "mina", stageId: "free_hammer", previousStageId: "base" }];
  game.GameState.data.partyResults[0].levelUps = [{ name: "鉱石収集隊", levels: 1, level: 10, newSkillIds: ["power_strike"], attributeChanges: { vitality: .1, strength: .2 }, statChanges: { hp: 8, attack: 2, maxWeight: 1.4 } }];
  game.GameState.data.partyResults[0].monsterObservations.slime = Object.assign({}, game.GameState.data.partyResults[0].monsterObservations.slime, {
    incomingAttempts: 7, incomingHits: 5, enemyTurns: 4, maxAttackCount: 2, magicAttack: true, rearTargeting: true, burstRounds: [2, 5],
    attackElements: ["neutral"], statusAttacks: ["poison"], elementWeaknesses: ["fire", "magic"], elementResistances: ["ice"],
    statusLanded: ["burn"], statusResisted: ["poison"], difficultySkillIds: []
  });
  const routeEventEntry = game.GameState.data.partyResults[0].battleLog.find(entry => entry.routeEventId);
  const routeEventDefinition = game.GameData.config.explorationEvents.routeEvents.find(event => event.id === routeEventEntry.routeEventId);
  routeEventEntry.routeEventMasteryApplied = true;
  routeEventEntry.routeEventPersonalPracticeApplied = true;
  routeEventEntry.routeRumorMatched = true;
  game.Story.ensure().facts.routeEvents[routeEventEntry.routeEventId].rumorMatches = Math.max(1, game.Story.ensure().facts.routeEvents[routeEventEntry.routeEventId].rumorMatches || 0);
  game.GameState.data.partyResults[0].newRumorConfirmationIds = [routeEventEntry.routeEventId];
  game.GameState.data.partyResults[0].rumorConfirmationReward = { itemId: "guild_seal", quantity: 1 };
  game.UI.render();
  assert(row(0).includes(`道中 噂と一致・${routeEventDefinition.name}・${routeEventEntry.routeEventSuccess ? "成功" : "失敗"}`) && row(0).includes("・経験活用") && row(0).includes("・記録活用"), "The party overview exposes rumor confirmation, personal practice, the latest route-event outcome and reused field knowledge without opening the full log");
  assert(row(0).includes("初めて確かめた噂 1種・印章+1") && row(0).includes("人物成長 ミナ") && row(0).includes("新スキル 1種") && row(0).includes("目標 +3 鉄鉱石・累計 3/10") && row(0).includes("超レア 1点") && row(0).includes("新称号 1種") && row(0).includes("初発見 1種") && row(0).includes("組合せ 1件") && row(0).includes("最高品質更新 1種") && row(0).includes("EXP +") && row(0).includes("装備 3点") && row(0).includes(`${resultLootName}・上質な布の服・ほか1種`) && row(0).includes("素材 9個") && row(0).includes("鉄鉱石×3・魔石×2・ほか1種"));
  assert(row(0).includes('<details class="fleet-loot-breakdown equipment">') && row(0).includes('aria-label="獲得装備の全件"') && row(0).includes("★天地を砕く 鉄の剣") && row(0).includes("超レア・天地を砕く"), "Tapping the equipment summary exposes every omitted item and ultra-rare title");
  assert(row(0).includes('<details class="fleet-loot-breakdown materials">') && row(0).includes('aria-label="獲得素材の全件"') && row(0).includes("加工材"), "Tapping the material summary exposes every omitted item");
  assert(row(1).includes("探索中") && row(1).includes('data-countdown="1"'));
  assert.strictEqual(game.Party.selected(), 1, "A different party's return must not change the selected party");
  assert(html().includes("1/2隊が探索中"));
  await click("party-open", { party: "0", view: "results" });
  assert.strictEqual(game.Party.selected(), 0); assert(html().includes("第1パーティの直近の探索結果"));
  assert.strictEqual(game.GameState.data.partyResults[0].viewed, true);
  assert(!node("main-nav").innerHTML.includes("nav-notice party"), "Opening the only unread report clears the party notice");
  assert(html().includes("JOURNEY DISCOVERY") && html().includes("道中で起きたこと") && html().includes("RUMOR CONFIRMED") && html().includes("噂だった兆しを、初めて実地で確かめました") && html().includes("噂と一致") && html().includes(routeEventDefinition.name) && html().includes(routeEventEntry.routeEventSuccess ? "成功" : "失敗") && html().includes("本人の経験を活用") && html().includes("観察記録を活用") && html().includes('data-target="result-battle-records"'), "The return report celebrates a first rumor confirmation and links personal and shared experience to the full exploration log");
  assert(html().includes("ADVENTURERS IN ACTION") && html().includes("この遠征で刻まれた働き") && html().includes("敵陣を切り開いた"), "The return report immediately gives individual adventurers factual recognition");
  assert(html().includes("探索目標を発見しました") && html().includes("鉄鉱石 ×3") && html().includes("累計 3 / 10") && html().includes("関連レシピを確認") && html().includes('data-action="open-target-recipes"') && html().includes("初めての品を1種類発見しました") && html().includes("is-new-discovery") && html().includes("過去最高の品質を1種類更新しました") && html().includes("is-quality-best") && html().includes("is-ultra-rare") && html().includes("NEW ULTRA RARE") && html().includes("新しい称号 1種") && html().includes("名を持つ逸品を1点発見しました") && html().includes("全装備性能2倍") && html().includes("称号記録を確認") && html().includes("アイテム図鑑で確認"));
  Object.assign(game.GameState.data.partyResults[0], {
    trackedItemId: "beast_hide", trackedItemQuantity: 4, trackedItemGoal: 4, trackedItemProgress: 4,
    craftingTargetAdvance: { recipeId: "forge_hide_robe", resultId: "hide_robe", completedItemId: "beast_hide", nextItemId: "slime_gel", nextQuantity: 2, materialsReady: false }
  });
  game.UI.render();
  assert(html().includes("CRAFTING PROJECT · 製作目標が進みました") && html().includes("獣皮の軽鎧") && html().includes("獣の皮が必要数に到達") && html().includes("次は粘液×2") && html().includes('data-recipes="forge_hide_robe"'), "A return report celebrates automatic progress from a completed material requirement into the selected crafting project");
  assert(html().includes('data-action="open-target-destination"') && html().includes('data-dungeon="meadow"') && html().includes("入手記録のある探索地"), "The same report offers a one-tap route into an accessible source for the next crafting material");
  Object.assign(game.GameState.data.partyResults[0], { trackedItemId: "iron_ore", trackedItemQuantity: 3, trackedItemGoal: 10, trackedItemProgress: 3, craftingTargetAdvance: null });
  Object.assign(game.GameState.data.partyResults[0], {
    trackedItemId: "sticky_fluid", trackedItemQuantity: 0, trackedItemGoal: 1, trackedItemProgress: 0,
    trackedItemHarvestId: "sticky_fluid", trackedItemHarvestMonsterId: "slime",
    trackedMonsterId: "slime", trackedMonsterQuantity: 3, trackedMonsterGoal: 10, trackedMonsterProgress: 3, trackedMonsterTrailId: "slime",
    trackedHarvestPractice: { characterId: "hunter-a", characterName: "リタ", tierId: "known_quarry", tierName: "獲物の癖を知る", multiplier: 1.1, successes: 3 },
    trackedHarvestPersistence: { characterId: "hunter-b", characterName: "ヨル", tierId: "trace_reader", tierName: "空振りの痕跡を読む", multiplier: 1.1, misses: 3 }
  });
  game.UI.render();
  assert(html().includes("result-tracked-achievement result-tracked-harvest") && html().includes("狙い採りの記録を試しました") && html().includes("スライム ×3体") && html().includes("ねばねばした液体 ・今回は見つからず") && html().includes("累計 0 / 1") && html().includes("累計 3 / 10"), "A targeted-harvest return combines the monster and item outcome, including an honest no-drop result");
  assert(html().includes("狩りの相談") && html().includes("リタの手覚えと、ヨルが拾った空振りの痕跡を、一冊の狩り記録として持ち帰った"), "The return report preserves the collaboration between different kinds of hunting experience");
  assert((html().match(/result-tracked-achievement/g) || []).length === 1 && !html().includes("探索目標を発見しました") && !html().includes("討伐目標と交戦しました"), "A paired return does not duplicate separate collection and hunt result panels");
  Object.assign(game.GameState.data.partyResults[0], {
    trackedItemId: "iron_ore", trackedItemQuantity: 3, trackedItemGoal: 10, trackedItemProgress: 3,
    trackedItemHarvestId: null, trackedItemHarvestMonsterId: null,
    trackedMonsterId: null, trackedMonsterQuantity: 0, trackedMonsterGoal: null, trackedMonsterProgress: null, trackedMonsterTrailId: null
  });
  game.UI.render();
  assert(html().includes("EQUIPMENT COMBINATION") && html().includes("装備の組合せ記録が進みました") && html().includes("風渡りの旅装") && html().includes("1 → 2 / 3") && html().includes("新効果：風渡りの足並み") && html().includes("組合せの記録を見る"), "The return report celebrates newly advanced equipment combinations and crossed bonus thresholds");
  assert(html().includes("MYSTERY NOTE") && html().includes("手掛かり帳に新しい記録が加わりました") && html().includes("街道へ向けられた獣") && html().includes("ホームの手掛かり帳を開く"), "A return report connects newly found story evidence to the long-running mystery ledger");
  assert(html().includes("result-level-ups") && html().includes("新しく習得") && html().includes("強撃") && html().includes("再使用まで10ターン") && html().includes("重量上限") && html().includes("+1.4"), "Level-up results preserve stat gains and explain newly learned skills");
  const report = game.GameState.data.partyResults[0];
  const discoveryCount = (report.newItemIds?.length || 0) + (report.newSetDiscoveries?.length || 0) + (report.newRecipeIds?.length || 0) + (report.newObservationIds?.length || 0) + (report.newMonsterInsights?.length || 0) + (report.newMonsterHabitats?.length || 0);
  assert(html().includes('class="result-highlight-strip"') && html().includes('<small>装備</small><strong>3点</strong>') && html().includes('<small>素材</small><strong>9個</strong>') && html().includes(`<small>新発見</small><strong>${discoveryCount}件</strong>`) && html().includes('<small>超レア</small><strong>1点</strong>'), "The return report summarizes important rewards before the full item list");
  assert(html().includes('class="result-analysis"') && html().includes("戦闘分析と探索ログ") && !html().includes('class="result-analysis" data-detail="result-analysis" open'), "Long combat analysis remains available without lengthening the initial mobile report");
  assert(html().includes("今回観測した敵の性質") && html().includes("スライム") && html().includes("弱点") && html().includes("炎") && html().includes("魔法そのもの") && html().includes("抵抗された異常") && html().includes("毒"), "The return report keeps observed affinities factual and collapsed inside combat analysis");
  assert(html().includes("攻撃命中") && html().includes("5/7回") && html().includes("最大2回") && html().includes("魔法行動") && html().includes("後列への攻撃を確認") && html().includes("第2T・第5T"), "The same report condenses directly observed accuracy, attack count, targeting and burst timing without exposing hidden rules");
  assert(html().includes('data-action="open-result-monsters"') && html().includes("資料室の記録と照合"), "A successful report can compare observed enemy traits with the persistent monster codex");
  await click("open-result-monsters", { dungeon: game.GameState.data.partyResults[0].dungeonId });
  assert(html().includes("モンスター図鑑") && html().includes("monster-expedition-context") && html().includes("今回 遭遇") && html().includes('data-action="return-to-result-report"'), "The success report opens the focused codex with exact expedition context");
  await click("return-to-result-report", { party: "0" });
  assert(html().includes("今回観測した敵の性質") && html().includes("資料室の記録と照合"), "The focused codex returns to the successful expedition report");
  assert(html().includes(`data-action="open-loot-instance" data-instance="${resultLootInstance.id}"`), "A retained equipment drop links to its exact inventory instance");
  assert(html().includes(`data-action="toggle-item-lock" data-instance="${resultLootInstance.id}"`) && html().includes("売却・分解を防ぐ"), "Retained equipment can be protected directly from the return report");
  await click("toggle-item-lock", { instance: resultLootInstance.id });
  assert.strictEqual(game.Items.getInstance(resultLootInstance.id).locked, true);
  assert(html().includes(`data-action="toggle-item-lock" data-instance="${resultLootInstance.id}" aria-pressed="true"`) && html().includes("保護を解除"), "The return report reflects a saved equipment lock without leaving the report");
  await click("toggle-item-lock", { instance: resultLootInstance.id });
  assert.strictEqual(game.Items.getInstance(resultLootInstance.id).locked, false);
  const compactDrops = game.GameState.data.partyResults[0].drops;
  game.GameState.data.partyResults[0].drops = [...compactDrops, { itemId: "iron_ore", quantity: 1 }, { itemId: "magic_stone", quantity: 1 }, { itemId: "craft_material", quantity: 1 }];
  game.UI.render();
  assert(html().includes('class="result-loot-disclosure"') && html().includes("戦利品の内訳") && !html().includes('class="result-loot-disclosure" data-detail="result-loot" open'), "Large returns collapse their full loot list by default on mobile-sized reports");
  game.GameState.data.partyResults[0].drops = compactDrops;
  game.UI.render();
  await click("open-loot-instance", { instance: resultLootInstance.id });
  assert(html().includes("is-focused-equipment") && html().includes('data-focused-instance="true"') && html().includes("今回の戦利品"), "The selected loot instance is opened and highlighted in inventory");
  await click("request-sell", { instance: resultLootInstance.id });
  assert(node("modal-root").innerHTML.includes("discard-warning") && node("modal-root").innerHTML.includes("処分後に所持数が0") && node("modal-root").innerHTML.includes("所持中の最高品質"), "Selling the last and best owned copy warns the player without deleting its discovery record");
  await click("close-modal");
  assert(html().includes(`data-action="choose-equipment-character" data-instance="${resultLootInstance.id}"`), "Focused loot can continue directly into character equipment");
  await click("choose-equipment-character", { instance: resultLootInstance.id });
  assert(node("modal-root").innerHTML.includes("誰が装備するか選ぶ") && node("modal-root").innerHTML.includes('data-action="inspect-equipment-character"'), "The loot route offers compatible adventurers before opening the full equipment screen");
  assert(node("modal-root").innerHTML.includes("equipment-character-deltas") && node("modal-root").innerHTML.includes("物攻 +"), "The loot route previews each compatible adventurer's main stat changes without opening them one by one");
  const compatibleCharacter = game.GameState.data.characters.find(character => game.Items.canEquip(character.id, resultLootInstance.id).ok);
  assert(compatibleCharacter);
  await click("inspect-equipment-character", { character: compatibleCharacter.id, instance: resultLootInstance.id });
  assert(node("modal-root").innerHTML.includes(`${compatibleCharacter.name}の装備`) && node("modal-root").innerHTML.includes("選択した装備") && node("modal-root").innerHTML.includes(`data-instance="${resultLootInstance.id}"`), "Choosing an adventurer opens the comparison screen with the exact loot selected");
  await click("equip-instance", { character: compatibleCharacter.id, instance: resultLootInstance.id });
  assert(node("modal-root").innerHTML.includes("equipment-change-notice") && node("modal-root").innerHTML.includes('data-action="review-equipped-character"') && node("modal-root").innerHTML.includes("パーティ編成で確認"), "After equipping loot, the result stays visible and links back to the owning party");
  await click("review-equipped-character", { character: compatibleCharacter.id });
  assert(html().includes("メンバー編成") && html().includes(compatibleCharacter.name), "The post-equip route opens the character's party formation");
  await click("party-back");
  await click("party-open", { party: "0", view: "results" });
  game.GameState.data.partyResults[0].trackedItemProgress = 10;
  game.UI.render();
  const craftPath = game.Blacksmith.relatedMaterialPlan("iron_ore");
  const craftPathResult = game.GameData.items[craftPath.resultId];
  assert(html().includes("累計 10 / 10・目標達成") && html().includes("集めた素材で製作へ") && html().includes('data-action="track-item" data-item="iron_ore" data-target-quantity="20"') && html().includes("さらに10個集める") && html().includes("製作への次の一手") && html().includes(craftPathResult.name), "A completed target can continue into a related crafting path or repeat the same collection batch directly from its return report");
  if (craftPath.nextNeed) assert(html().includes(`data-action="track-recipe-material" data-item="${craftPath.nextNeed.itemId}" data-target-quantity="${craftPath.nextNeed.missing}"`) && html().includes(`次は${game.GameData.items[craftPath.nextNeed.itemId].name}を集める`), "The return report can replace a completed target with the next missing recipe material");
  const resultRecipeIds = (html().match(/data-action="open-target-recipes" data-recipes="([^"]+)"/) || [])[1];
  assert(resultRecipeIds);
  await click("open-target-recipes", { recipes: resultRecipeIds });
  assert(html().includes("探索目標に関係する") && html().includes("製作レシピ"), "The return report opens only recipes related to the recovered target material");
  const firstGold = game.GameState.data.gold;
  await tick(); assert.strictEqual(game.GameState.data.gold, firstGold, "Viewing results does not collect duplicate rewards");
  assert.strictEqual(game.GameState.data.partyHistory[0].length, 1, "A compact return summary is retained per party");
  const firstRouteEvents = game.GameState.data.partyHistory[0][0].routeEvents;
  assert(firstRouteEvents.length >= 1 && firstRouteEvents.every(event => event.id && typeof event.success === "boolean" && event.text), "Expedition history retains compact route-event outcomes");
  game.GameState.data.partyHistory[0][0].routeMasteryIds = [firstRouteEvents[0].id];
  game.GameState.data.story.facts.routeEvents[firstRouteEvents[0].id] = { encounters: 3, successes: 3 };
  game.GameState.data.partyHistory[0][0].storyMoments = [
    { kind: "discovery", dungeonId: "meadow", sceneId: game.Story.dungeonDiscoveryScene(game.GameData.dungeons.meadow).id },
    { kind: "ending", dungeonId: "meadow", sceneId: game.Story.dungeonEndingScene(game.GameData.dungeons.meadow).id }
  ];
  game.GameState.data.partyHistory[0][0].growth = [{ name: "鉱石収集隊", level: 10, newSkillIds: ["power_strike"], attributeChanges: { vitality: .1, strength: .2 }, statChanges: { hp: 8, attack: 2, maxWeight: 1.4 } }];
  game.GameState.data.partyHistory[0][0].targetedHarvest = { itemId: "sticky_fluid", monsterId: "slime", itemQuantity: 0, monsterQuantity: 3, itemGoal: 1, itemProgress: 0, monsterGoal: 10, monsterProgress: 3, practice: { characterId: "hunter-a", characterName: "リタ", tierName: "獲物の癖を知る" }, persistence: { characterId: "hunter-b", characterName: "ヨル", tierName: "空振りの痕跡を読む" } };
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  game.UI.navigate("blacksmith"); await click("blacksmith-open", { view: "craft" });
  const mainArea = node(".main-area"); mainArea.scrollTop = 347;
  assert(html().includes("製作レシピ") && html().includes("data-detail=\"forge-recipe-"));
  const blacksmithBeforeReturn = html();
  now += 30000; await tick();
  assert.strictEqual(node("page-title").textContent, "鍛冶屋");
  assert.strictEqual(mainArea.scrollTop, 347, "A party return preserves the blacksmith scroll position");
  assert.strictEqual(html(), blacksmithBeforeReturn, "A party return leaves the open product and recipe DOM untouched");
  assert(html().includes("製作レシピ") && html().includes("鍛冶メニュー"), "A party return keeps the current blacksmith route open");
  game.UI.navigate("party");
  await click("party-back");
  assert(row(0).includes("攻略成功") && row(1).includes("攻略成功"));
  assert.strictEqual(game.GameState.data.partyHistory[0].length, 2, "New returns are added without discarding the prior summary");
  game.GameState.data.partyHistory[0][0].targetedHarvest = { itemId: "sticky_fluid", monsterId: "slime", itemQuantity: 2, monsterQuantity: 4, itemGoal: 3, itemProgress: 2, monsterGoal: 10, monsterProgress: 7, practice: { characterId: "hunter-a", characterName: "リタ", tierName: "獲物の癖を知る" }, persistence: { characterId: "hunter-b", characterName: "ヨル", tierName: "空振りの痕跡を読む" } };
  game.GameState.data.partyHistory[0][1].battle.skillUses = { power_strike: 2 };
  game.GameState.data.partyHistory[0][1].battle.skillDamage = { power_strike: 40 };
  game.GameState.data.partyHistory[0][1].materials = [{ itemId: "iron_ore", quantity: 1 }];
  game.GameState.data.partyHistory[0][0].battle.skillUses = { power_strike: 2 };
  game.GameState.data.partyHistory[0][0].battle.skillDamage = { power_strike: 90 };
  assert(row(0).includes("過去の帰還 1件") && row(0).includes("装備") && row(0).includes("素材") && html().includes('data-party="0" data-view="history"'), "Older rewards and the full expedition history are available from the compact party row");
  game.Characters.setActionRates(a, { healing: 70, spell: 80, technique: 90, attack: 60 });
  await click("party-open", { party: "0", view: "history" });
  assert(html().includes("EXPEDITION HISTORY") && html().includes("遠征履歴") && (html().match(/class="party-history-record/g) || []).length === 2 && html().includes("到達") && html().includes("戦闘不能") && html().includes("受けた傷の内訳") && html().includes("冒険者ごとの働きの差") && html().includes("遠征時の編成") && html().includes("重量") && html().includes("回100% → 呪100% → 技100% → 攻100%") && html().includes("同条件の前回との差") && html().includes("前回") && html().includes("→") && html().includes("出撃時と現在の差") && html().includes("行動率 回100→70%・呪100→80%・技100→90%・攻100→60%") && html().includes("直近ログを開く"), "The party history links same-condition member results, incoming damage, immutable departure setups and current factual differences");
  assert(html().includes("物語の記録") && html().includes("探索で判明") && html().includes("攻略後") && html().includes("この遠征を歩いた冒険者") && html().includes("鉱石収集隊"), "Story discoveries remain attached to the adventurers who witnessed them in expedition history");
  assert(html().includes("成長の記録") && html().includes("新スキル1種") && html().includes("基礎 生命+0.1・筋力+0.2") && html().includes("技「強撃」") && html().includes("重量上限+1.4"), "Expedition history keeps attribute, stat, capacity and learned-skill milestones after newer returns arrive");
  assert(html().includes("遠征の働き") && html().includes("敵陣を切り開いた") && html().includes("実ダメージ"), "Expedition history preserves compact factual adventurer highlights");
  assert(html().includes("狙い採りの記録") && html().includes("スライム") && html().includes("ねばねばした液体") && html().includes("討伐 <b>+3体</b>") && html().includes("今回は見つからず") && html().includes("品の記録 <b>0 / 1</b>") && html().includes("討伐記録 <b>3 / 10</b>"), "Expedition history preserves paired hunt outcomes, including no-drop attempts and both progress records");
  assert(html().includes("狩りの相談") && html().includes("リタの手覚えと、ヨルが拾った空振りの痕跡"), "Expedition history keeps the two-person hunting consultation after newer returns arrive");
  assert(html().includes("狙い採りの足跡") && html().includes("1組・2遠征") && html().includes("遠征 <b>2回</b>") && html().includes("収穫 <b>1回</b>") && html().includes("品 <b>+2</b>") && html().includes("討伐 <b>7体</b>") && html().includes('class="is-found">収</i><i class="is-missed">空</i>') && html().includes("持ち帰れた遠征と空振りの遠征がある。狙う道筋は確かめられている。") && html().includes("この狩りを続ける") && html().includes("party-history-harvest-reuse"), "The field ledger groups comparable attempts, narrates only observed facts and restores the newest matching hunt without exposing hidden odds");
  assert(html().includes("状態異常") && html().includes("行動内訳") && html().includes("発動技能") && html().includes("再使用まで") && html().includes("技能の働きの差") && html().includes("発動 2→2回") && html().includes("与 40→90"), "Expedition history compares skill results even when use counts stay unchanged");
  assert(html().includes("道中の記録") && html().includes("知見完成 1種") && html().includes("知見が仲間へ共有された") && html().includes("道中成功"), "Route outcomes, completed knowledge and same-condition route comparisons survive newer returns");
  const recalled = game.GameState.data.partyHistory[0][1];
  assert(html().includes("同じ狙い採りを続ける") && html().includes('data-action="reuse-history-harvest"'), "A retained targeted harvest offers one direct continuation action");
  game.Encyclopedia.setTrackedItem(null);
  game.Encyclopedia.setTrackedMonster(null);
  await click("reuse-history-harvest", { party: "0", dungeon: recalled.dungeonId, difficulty: recalled.difficultyId, time: String(recalled.timeMultiplier), item: recalled.targetedHarvest.itemId, monster: recalled.targetedHarvest.monsterId });
  assert.strictEqual(game.Encyclopedia.trackedTarget().itemId, recalled.targetedHarvest.itemId);
  assert.strictEqual(game.Encyclopedia.trackedMonsterTarget().monsterId, recalled.targetedHarvest.monsterId);
  assert(!game.Party.expedition(0) && html().includes("出撃先指定") && JSON.stringify(game.Party.plan(0)) === JSON.stringify({ dungeonId: recalled.dungeonId, difficultyId: recalled.difficultyId, timeMultiplier: recalled.timeMultiplier }), "Continuing a targeted harvest restores both records and the historical route for review without auto-departing");
  await click("party-view", { view: "history" });
  assert(html().includes("この探索条件を呼び戻す") && html().includes('data-action="reuse-history-plan"'), "Every retained expedition can restore its departure settings without immediately leaving");
  await click("reuse-history-plan", { party: "0", dungeon: recalled.dungeonId, difficulty: recalled.difficultyId, time: String(recalled.timeMultiplier) });
  assert(!game.Party.expedition(0) && html().includes("出撃先指定") && JSON.stringify(game.Party.plan(0)) === JSON.stringify({ dungeonId: recalled.dungeonId, difficultyId: recalled.difficultyId, timeMultiplier: recalled.timeMultiplier }), "A historical route opens as a saved plan for review instead of auto-departing");
  assert.strictEqual(game.Party.unreadResultCount(), 2, "Opening history does not mark the latest report as read");
  await click("party-back");
  assert.strictEqual(game.Party.unreadResultCount(), 2, "Both newly returned parties have unread reports");
  assert(html().includes('aria-label="未読2件">新2</i>'), "The report filter updates when several parties have unread returns");
  game.GameState.data.partyResults[0].viewed = true;
  game.UI.render();
  await click("party-overview-filter", { filter: "reports" });
  assert(html().indexOf('data-party-overview="1"') < html().indexOf('data-party-overview="0"'), "The report filter places unread party results before read results");
  game.GameState.data.partyResults[0].viewed = false;
  game.UI.render();
  assert.strictEqual(game.Party.unreadResultCount(), 2, "Testing report order preserves both unread results for the navigation flow");
  assert(!html().includes("data-countdown") && html().includes("0/2隊が探索中"));
  node(".main-area").scrollTop = 420;
  await click("party-open", { party: "0", view: "results" });
  await click("party-back");
  assert.strictEqual(node(".main-area").scrollTop, 0, "Returning to the report filter moves to the next unread result instead of restoring a lower scroll position");
  assert(html().indexOf('data-party-overview="1"') < html().indexOf('data-party-overview="0"'), "The next unread party is visible first after returning from a report");
  await click("party-open", { party: "0", view: "results" });
  game.GameState.data.partyResults[0].memberReports[0].skillUses = { power_strike: 2 };
  game.GameState.data.partyResults[0].memberReports[0].skillDamage = { power_strike: 123 };
  game.GameState.data.partyResults[0].trackedItemId = "iron_ore";
  game.GameState.data.partyResults[0].trackedItemQuantity = 3;
  const rivalHarvestRecord = JSON.parse(JSON.stringify(game.GameState.data.partyHistory[0][1]));
  rivalHarvestRecord.id = "rival-iron-harvest";
  rivalHarvestRecord.dungeonId = game.GameState.data.partyResults[0].dungeonId;
  rivalHarvestRecord.difficultyId = game.GameState.data.partyResults[0].difficultyId || "normal";
  rivalHarvestRecord.timeMultiplier = game.GameState.data.partyResults[0].timeMultiplier || 1;
  rivalHarvestRecord.completedAt = game.GameState.data.partyResults[0].completedAt - 1;
  rivalHarvestRecord.equipment = [];
  rivalHarvestRecord.materials = [{ itemId: "iron_ore", quantity: 2 }];
  game.GameState.data.partyHistory[1].push(rivalHarvestRecord);
  game.UI.render();
  assert(html().includes("result-skill-usage") && html().includes("発動した技・呪文・回復") && html().includes("強撃") && html().includes("×2") && html().includes("直接ダメージ 123"), "The return report summarizes actual skill rotations, contribution and descriptions on tap");
  assert(html().includes("attempt-comparison") && html().includes("同じ探索条件の前回記録") && html().includes("到達戦") && html().includes("物理命中") && html().includes("<span>状態異常</span>") && html().includes("（抵抗") && html().includes("<span>行動内訳</span>") && html().includes("回") && html().includes("・呪") && html().includes("・技") && html().includes("・攻") && html().includes("・防") && html().includes("与ダメージ") && html().includes("戦闘不能") && html().includes("<span>報酬</span>") && html().includes("<span>戦利品</span>") && html().includes("・経験値") && html().includes("装備") && html().includes("・素材") && html().includes("attempt-setup-changes") && html().includes("受けた傷の変化") && html().includes("冒険者ごとの働き") && html().includes("前回から変えた編成") && html().includes("技能の働きの変化"), "A repeated route compares factual outcomes, incoming-damage causes, member results, party changes and skill results in compact disclosures");
  assert(html().includes("attempt-target-yield is-improved") && html().includes("探索目標の収穫") && html().includes("鉄鉱石") && html().includes("前回より2個多く持ち帰れました。") && html().includes(`NEW BEST · ${game.Party.name(1)}の2個を越え、この条件の最高収穫を3個へ更新`) && html().includes("<b>1個</b>") && html().includes("<b>3個</b>") && html().includes('data-action="open-item-codex" data-item="iron_ore"') && html().includes('data-action="retrace-history-item"') && html().includes('data-item="iron_ore" data-target="4"') && html().includes("次は4個へ"), "A repeated targeted route compares the exact sought item's yield, credits a guild-wide rival record and offers a one-tap challenge at the next quantity");
  game.GameState.data.partyResults[0].trackedItemQuantity = 1;
  game.UI.render();
  assert(html().includes(`これまでの最高 2個（${game.Party.name(1)}） · あと1個`), "A yield below another party's guild-wide record names its holder and the remaining gap");
  game.GameState.data.partyResults[0].trackedItemQuantity = 0;
  game.UI.render();
  assert(html().includes("attempt-target-yield is-missed") && html().includes(`これまでの最高 2個（${game.Party.name(1)}） · あと2個`), "A missed target find keeps the guild-wide best and its holder visible without presenting it as a new record");
  game.GameState.data.partyResults[0].trackedItemQuantity = 3;
  game.UI.render();
  assert(html().includes("report-party-navigation") && html().includes("1 / 2件") && html().includes("次の未読報告") && game.Party.unreadResultCount() === 1, "Multiple party reports expose the next unread report without returning to the overview");
  game.GameState.data.partyHistory[1] = game.GameState.data.partyHistory[1].filter(entry => entry.id !== rivalHarvestRecord.id);
  await click("switch-party-result", { party: "1" });
  assert.strictEqual(game.Party.selected(), 1);
  assert(html().includes(`${game.Party.name(1)}の直近の探索結果`) && game.Party.unreadResultCount() === 0 && !node("main-nav").innerHTML.includes("nav-notice party"), "Switching reports marks the destination report read and updates the global notice");
  await click("switch-party-result", { party: "0" });
  assert.strictEqual(game.Party.selected(), 0);
  await click("party-back");
  assert(html().includes("最高収穫を3個へ更新 · 鉄鉱石") && html().includes('class="target-record" data-action="open-item-codex" data-item="iron_ore"') && html().includes('class="target-record-next" data-action="retrace-history-item" data-party="0"') && html().includes('data-item="iron_ore" data-target="4"') && html().includes("次は4個へ"), "The party overview keeps a newly set target-item route record visible and offers the next record attempt without reopening the full report");
  game.GameState.data.partyResults[0].success = false;
  game.GameState.data.partyResults[0].defeatFacts = ["第3戦で前衛2人が戦闘不能になった。"];
  game.GameState.data.partyResults[0].retryPreparationGrowth = { previousFailures: 0, failures: 1, damageReduction: .03, atMaximum: false };
  game.GameState.data.partyResults[0].newAchievementIds = ["first_retreat_record"];
  game.GameState.data.partyResults[0].newObservationIds = ["retry_preparation"];
  game.GameState.data.story.facts.retryPreparationObserved = true;
  assert((await game.GameClient.execute("party.setPlan", { dungeonId: game.GameState.data.partyResults[0].dungeonId, difficultyId: game.GameState.data.partyResults[0].difficultyId || "normal", timeMultiplier: game.GameState.data.partyResults[0].timeMultiplier || 1, partyIndex: 0 })).ok);
  const terminalVictory = [...game.GameState.data.partyResults[0].battleLog].reverse().find(entry => entry.kind === "victory");
  if (terminalVictory) { terminalVictory.kind = "defeat"; terminalVictory.text = "前衛が崩れ、探索隊は撤退した。"; }
  game.UI.render();
  assert(row(0).includes("撤退") && row(0).includes("is-last-failure") && row(0).includes('fleet-result-mark failure'));
  assert(row(0).includes("次回の備え 1/3・被ダメージ-3%") && row(0).includes("新しい実績 地図を捨てない") && row(0).includes("観察日記 +1頁") && row(0).includes('data-action="open-achievements" data-achievement="first_retreat_record"') && row(0).includes('data-action="open-observations" data-note="retry_preparation"'), "The party overview immediately exposes retry help and exact routes to its newly opened records without opening the full report");
  assert(html().includes('data-action="quick-start-party" data-party="0" data-departure-kind="retry"') && html().includes("備えを活かして再挑戦"), "A failed party whose saved destination still matches its retreat gets an explicit one-tap retry action");
  await click("open-achievements", { achievement: "first_retreat_record" });
  assert(html().includes('class="achievement-card is-complete  is-focused"') && html().includes('data-achievement="first_retreat_record"'), "The new-achievement chip opens and highlights the exact earned record");
  game.UI.navigate("party");
  await click("open-observations", { note: "retry_preparation" });
  assert(html().includes('class="observation-note  is-focused" data-observation="retry_preparation" open') && !game.ObservationJournal.unread().some(note => note.id === "retry_preparation"), "The new-observation chip opens the exact diary page and records it as read");
  game.UI.navigate("party");
  await click("party-open", { party: "0", view: "results" });
  assert(html().includes("failure-evidence-links") && html().includes('data-target="defeat-observations"') && html().includes('data-target="result-battle-records"') && html().includes('data-action="open-result-monsters"'), "A failed report links observed facts, the relevant combat record and encountered monsters without prescribing a solution");
  assert(html().includes("journey-encounter is-complete is-defeat") && html().includes("battle-observation-summary") && html().includes("open"), "The actual retreat encounter is expanded with its observation summary");
  await click("open-result-monsters", { dungeon: game.GameState.data.partyResults[0].dungeonId });
  assert(html().includes("モンスター図鑑") && html().includes(`class="monster-dungeon-group is-focused-dungeon" data-dungeon="${game.GameState.data.partyResults[0].dungeonId}" open`) && html().includes("直前の探索で遭遇"), "The monster codex opens at the dungeon from the failed expedition");
  assert(html().includes("monster-expedition-context") && html().includes("is-recent-encounter") && html().includes("今回 遭遇") && html().includes("討伐") && html().includes('data-action="return-to-result-report"'), "Monsters from the exact expedition show encounter and defeat counts, with a route back to the report");
  await click("return-to-result-report", { party: "0" });
  assert(html().includes(`${game.Party.name(0)}の直近の探索結果`) && html().includes("failure-evidence-links"), "The focused codex returns to the originating party report");
  delete game.GameState.data.partyResults[0].trackedHarvestPractice;
  delete game.GameState.data.partyResults[0].trackedHarvestPersistence;
  game.GameState.data.partyHistory[0].forEach(entry => {
    if (!entry.targetedHarvest) return;
    delete entry.targetedHarvest.practice;
    delete entry.targetedHarvest.persistence;
  });
  await click("party-open", { party: "1", view: "formation" });
  assert.strictEqual(game.Party.selected(), 1); assert(html().includes("メンバー編成") && html().includes("パーティ一覧"));
  await click("party-open", { party: "0", view: "invalid" }); assert.strictEqual(game.Party.selected(), 1);
  await click("party-back");
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 1 })).ok);
  game.UI.render();
  assert(row(1).includes("探索中"));
  node(".main-area").scrollTop = 275;
  now = game.GameState.data.expeditions[1].endsAt; await tick();
  assert(!row(1).includes("探索中") && /攻略成功|撤退/.test(row(1)) && html().includes('data-party="1" data-view="results" aria-label="第2パーティの直近ログ・未読"'), "The party overview reflects a background return without requiring navigation away and back");
  assert.strictEqual(node(".main-area").scrollTop, 275, "Refreshing the live party overview preserves its scroll position");
  game.UI.navigate("home"); assert(!html().includes("PARTY STATUS"));
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  console.log("Party overview test passed: all-party status/destinations/members, lock/empty states, live dual timers/progress, direct task links, background return, results isolation and once-only rewards");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
