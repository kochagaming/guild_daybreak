const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { id, innerHTML: "", textContent: "", value: "", scrollTop: 0, focus() {}, classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, disabled: false, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? button : null } });
}

async function run() {
  game.GameState.reset();
  game.GameState.data.story.readSceneIds.push("whispering_brook_clear");
  const character = require("./helpers").createCharacter(game, "導線確認の戦士");
  require("./helpers").createCharacter(game, "経験の浅い魔術師", "mage");
  const hunter = game.Characters.get(character.id);
  hunter.expeditionRecord.targetedHarvestAttempts = 6;
  hunter.expeditionRecord.targetedHarvestSuccesses = 3;
  hunter.expeditionRecord.targetedHarvestItems = 3;
  const harvestMonsterId = Array.from(new Set(game.GameData.dungeons.meadow.encounters.flatMap(encounter => encounter.groups.flat())))
    .find(monsterId => game.MonsterLoot.fixedDropIds(monsterId, "normal").some(itemId => game.GameData.items[itemId]?.type === "material"));
  const harvestItemId = game.MonsterLoot.fixedDropIds(harvestMonsterId, "normal").find(itemId => game.GameData.items[itemId]?.type === "material");
  hunter.expeditionRecord.targetedHarvestRecords[`${harvestMonsterId}::${harvestItemId}`] = { attempts: 6, successes: 3, items: 3, lastAt: Date.now() };
  game.UI.init(); game.UI.navigate("characters");
  let html = node("app").innerHTML;
  assert(html.includes('data-action="open-character"') && !html.includes("character-detail-card"));

  node(".main-area").scrollTop = 420;
  await click("open-character", { character: character.id });
  html = node("app").innerHTML;
  assert(html.includes("冒険者一覧へ戻る") && html.includes("導線確認の戦士") && html.includes("character-detail-card"));
  const statOrder = ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "hitRate", "evasionRate", "criticalRate", "statusChanceBonus", "speed", "attackCount", "physicalPower", "magicPower", "skillPower", "healingPower", "healingReceived", "maxWeight"];
  assert(html.includes("data-character-stats") && html.includes('class="skill-chip-detail'), "Character details use the common stat list and tappable skills");
  statOrder.slice(1).forEach((key, index) => assert(html.indexOf(`data-stat="${statOrder[index]}"`) < html.indexOf(`data-stat="${key}"`), `Character stat order keeps ${statOrder[index]} before ${key}`));
  assert(html.includes("skill-chip-description") && html.includes("スキル名を押すと効果を確認できます。"));
  assert(html.includes("遠征の足跡") && html.includes("まだ出撃記録はありません"), "A new adventurer starts with a compact empty expedition ledger");
  assert(html.includes("獲物ごとの狙い採り") && html.includes("手覚え：獲物の癖を知る") && html.includes("痕跡：空振りの痕跡を読む"), "A personal ledger should preserve both successful practice and clues learned from empty-handed attempts without exposing multipliers");
  assert(html.includes("装備を変更") && html.includes("転職先を確認"));

  await click("open-equipment", { character: character.id });
  assert(node("modal-root").innerHTML.includes("導線確認の戦士の装備"));
  assert(node("modal-root").innerHTML.includes("attribute-radar-card") && node("modal-root").innerHTML.includes("PRIMARY ATTRIBUTES"), "Equipment screen keeps the primary-attribute radar visible");
  await click("close-modal");
  await click("request-class-change", { character: character.id });
  assert(node("modal-root").innerHTML.includes("導線確認の戦士の転職"));
  await click("close-modal");

  await click("character-back");
  html = node("app").innerHTML;
  assert(html.includes('data-action="open-character"') && !html.includes("character-detail-card"));
  assert.strictEqual(node(".main-area").scrollTop, 420);
  Object.keys(game.Characters.get(character.id).attributes).forEach(key => { game.Characters.get(character.id).attributes[key] = 999; });
  assert(game.Party.toggle(character.id).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  game.GameState.data.expeditions[0].endsAt = Date.now() - 1;
  game.Dungeon.completeIfReady();
  const expeditionRecord = game.Characters.get(character.id).expeditionRecord;
  expeditionRecord.routeSuccesses += 5;
  expeditionRecord.routeEventSuccesses.hidden_passage = 5;
  expeditionRecord.treasureOpenings = 10;
  expeditionRecord.skillRecords = { power_strike: { uses: 12, damage: 345, healing: 0, statuses: 0 } };
  if (!game.Encyclopedia.item("iron_ore")) game.Items.add("iron_ore", 1);
  game.Encyclopedia.recordItemDiscovery("iron_ore", { characterId: character.id, name: game.Characters.get(character.id).name, roleTitle: "道標を拾う者", dungeonId: "cave", difficultyId: "normal", completedAt: Date.now() });
  assert(game.Encyclopedia.itemDiscovery("iron_ore")?.characterId === character.id, "The first-find record belongs to the adventurer before rendering");
  assert(game.Characters.expeditionMilestones(game.Characters.get(character.id)).find(entry => entry.id === "first_item_discovery").complete, "A first-find record derives the discoverer medal");
  assert(game.Encyclopedia.monsterFirstDefeatsByCharacter(character.id).length > 0, "A victorious first expedition credits the adventurer as part of the first-defeat party");
  assert(game.Characters.expeditionMilestones(game.Characters.get(character.id)).find(entry => entry.id === "first_monster_first_defeat").complete, "A first-defeat record derives the expedition medal");
  await click("open-character", { character: character.id });
  html = node("app").innerHTML;
  assert(html.includes("出撃 1回・攻略 1回") && html.includes("累計実ダメージ") && html.includes("一遠征の最高与ダメージ") && html.includes("近頃の評判"), "Completed expeditions accumulate in the adventurer's personal ledger and begin shaping an observed reputation");
  const retainedPerformance = game.GameState.data.partyHistory[0][0].battle.members.find(member => member.id === character.id);
  assert(retainedPerformance, "A completed expedition retains this adventurer's compact personal performance");
  const meadowName = game.DungeonDifficulty.variant("meadow", "normal").name;
  const retainedHistoryId = game.GameState.data.partyHistory[0][0].id;
  const recentRole = game.Characters.recentExpeditionRole(game.Characters.get(character.id));
  assert(recentRole && recentRole.label === game.Characters.expeditionRoleLabel(game.GameState.data.partyHistory[0][0].memberHighlights.find(highlight => highlight.memberId === character.id).kind), "A recent role should be derived from the adventurer's retained expedition highlights");
  assert(html.includes("最近の遠征") && html.includes(meadowName) && html.includes('data-action="open-character-expedition"') && html.includes(`data-history="${retainedHistoryId}"`) && html.includes("残HP") && html.includes("単独遠征"), "The personal ledger connects recent performance and travel companions to its exact retained party history");
  assert(html.includes("道中で身についた経験") && html.includes("隠し道を見つけた") && html.includes("封印箱を開けた") && html.includes("身についた得意分野") && html.includes("隠し道") && html.includes("開錠"), "The personal ledger combines route and chest-opening experience into compact field specialties");
  assert(html.includes("初発見の持ち帰り") && html.includes("鉄鉱石") && html.includes("拾い手の小章"), "The personal ledger connects first-found items and their earned discoverer medal to the adventurer");
  assert(html.includes("初討伐の同行記録") && html.includes("初討の小章"), "The personal ledger connects guild-first victories and their earned medal to the adventurer");
  assert(html.includes("隠し道の記章"), "Repeated success in one route-event discipline earns a selectable specialist medal");
  assert(html.includes("使い込んだ技能") && html.includes("強撃") && html.includes("発動 12回") && html.includes("直接ダメージ 345") && html.includes("手慣れ") && html.includes("得意技") && html.includes("38回"), "Character history shows cumulative signature-skill contribution and progress through use-based mastery names");
  assert(html.includes('data-action="select-record-title"') && html.includes("初陣の記章"), "Earned personal medals can be selected from the expedition ledger");
  assert((await game.GameClient.execute("character.recordTitle", { characterId: character.id, milestoneId: "first_sortie" })).ok, "An earned medal can be displayed as the adventurer's record title");
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok, "A titled adventurer can leave on another expedition");
  assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].recordTitleId, "first_sortie", "The displayed record title is snapshotted at departure");
  game.GameState.data.expeditions[0] = null;
  game.UI.render(); html = node("app").innerHTML;
  assert(html.includes("初陣の記章") && html.includes("表示中"), "The selected record title is visible on the adventurer detail");
  assert(!(await game.GameClient.execute("character.recordTitle", { characterId: character.id, milestoneId: "hundred_victories" })).ok, "An unearned medal cannot be displayed");
  await click("open-character-expedition", { party: "0", history: retainedHistoryId, character: character.id }); html = node("app").innerHTML;
  assert(html.includes("遠征履歴") && html.includes(meadowName) && html.includes(`data-history-id="${retainedHistoryId}"`) && html.includes("人物の足跡から選択") && html.includes("導線確認の戦士の記録をたどっています") && html.includes("同行者なし") && html.includes("この冒険者の足跡へ戻る"), "A recent personal expedition opens and highlights the exact party record with that adventurer's role, companions and return route");
  game.UI.navigate("characters");
  await click("character-back"); html = node("app").innerHTML;
  assert(html.includes("探索 隠し道・開錠") && html.includes(`近頃 ${recentRole.label}`) && html.includes('data-character-filter="specialty"') && html.includes('value="treasure_opening"') && html.includes('value="targeted_harvest"') && html.includes("探索経験順") && html.includes("狙い採り経験順"), "The character directory exposes field, opening and targeted-harvest experience for filtering and sorting");
  await listeners.change({ target: { value: "hidden_passage", dataset: { characterFilter: "specialty" }, hasAttribute: key => key === "data-character-filter" } });
  html = node("app").innerHTML;
  assert(html.includes("導線確認の戦士") && !html.includes("経験の浅い魔術師") && html.includes("1ページ · 1人"), "A field-specialty filter isolates experienced adventurers from a large directory");
  await listeners.change({ target: { value: "targeted_harvest", dataset: { characterFilter: "specialty" }, hasAttribute: key => key === "data-character-filter" } });
  html = node("app").innerHTML;
  assert(html.includes("導線確認の戦士") && !html.includes("経験の浅い魔術師") && html.includes("1ページ · 1人"), "A targeted-harvest filter finds adventurers who participated in that kind of hunt");
  await listeners.change({ target: { value: "all", dataset: { characterFilter: "specialty" }, hasAttribute: key => key === "data-character-filter" } });
  game.UI.navigate("archives"); await click("archive-view", { view: "records" });
  html = node("app").innerHTML;
  assert(html.includes("遠征者の記録") && html.includes("遠征回数") && html.includes("一遠征の与ダメージ") && html.includes("導線確認の戦士") && html.includes("初陣の記章"), "The archive compares actual personal records and displayed medals across adventurers");
  assert(html.includes("技能の使い手") && html.includes("1人・1技") && html.includes("強撃 · 手慣れ") && html.includes("12回"), "The archive keeps a compact cross-character index of earned signature skills");
  console.log("Character navigation test passed: compact directory, dedicated detail, equipment/class-change actions and list scroll restoration");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
