const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), listeners = {}, nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { id, innerHTML: "", textContent: "", value: "", focus() {}, classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: selector => node(selector), querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, create = require("./helpers").createCharacter;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, disabled: false, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? button : null } });
}
function count(source, pattern) { return (source.match(new RegExp(pattern, "g")) || []).length; }

async function run() {
  const styles = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
  assert(styles.includes("v0.39 unified party and equipment console") && styles.includes("@media (min-width: 721px)"), "Party and equipment workflow should share one responsive design across mobile and desktop");
  assert(styles.includes("v0.458 compact mobile primary attributes") && styles.includes("grid-template-columns:minmax(136px,42%) minmax(0,1fr)"), "The mobile equipment screen should keep the primary-attribute chart beside compact values instead of adding another tall vertical block");
  game.GameState.reset();
  const ids = [];
  for (let index = 1; index <= 45; index += 1) ids.push(create(game, `冒険者${String(index).padStart(2, "0")}`, index % 2 ? "warrior" : "mage").id);
  const fieldGuide = game.Characters.get(ids[0]);
  fieldGuide.expeditionRecord.routeSuccesses = 5;
  fieldGuide.expeditionRecord.routeEventSuccesses.hidden_passage = 5;
  fieldGuide.expeditionRecord.treasureOpenings = 10;
  fieldGuide.expeditionRecord.targetedHarvestAttempts = 6;
  fieldGuide.expeditionRecord.targetedHarvestSuccesses = 3;
  fieldGuide.expeditionRecord.targetedHarvestItems = 7;
  const harvestMonsterId = Array.from(new Set(game.GameData.dungeons.meadow.encounters.flatMap(encounter => encounter.groups.flat())))
    .find(monsterId => game.MonsterLoot.fixedDropIds(monsterId, "normal").some(itemId => game.GameData.items[itemId]?.type === "material"));
  const harvestItemId = game.MonsterLoot.fixedDropIds(harvestMonsterId, "normal").find(itemId => game.GameData.items[itemId]?.type === "material");
  game.Items.add(harvestItemId, 1);
  game.Encyclopedia.recordBattle({ [harvestMonsterId]: 1 }, {}, { [harvestMonsterId]: { drops: [harvestItemId] } }, "normal", { dungeonId: "meadow" });
  assert((await game.GameClient.execute("encyclopedia.trackHarvest", { itemId: harvestItemId, monsterId: harvestMonsterId })).ok, "The formation test should prepare one observed monster-and-item harvest target");
  fieldGuide.expeditionRecord.targetedHarvestRecords[`${harvestMonsterId}::${harvestItemId}`] = { attempts: 6, successes: 3, items: 7, lastAt: Date.now() };
  fieldGuide.expeditionRecord.skillRecords.power_strike = { uses: 210, damage: 1200, healing: 0, statuses: 0 };
  game.GameState.data.partyHistory[0] = Array.from({ length: 3 }, (_, index) => ({
    id: `role-clue-${index}`, completedAt: Date.now() - index,
    battle: { members: [{ id: ids[1], name: "冒険者02" }, { id: ids[2], name: "冒険者03" }] },
    memberHighlights: [{ memberId: ids[1], kind: "healing" }, { memberId: ids[2], kind: "damage" }]
  }));
  [10, 3, 1].forEach((clears, characterIndex) => {
    for (let index = 0; index < clears; index += 1) game.GameState.data.partyHistory[0].push({
      id: `destination-clue-${characterIndex}-${index}`, dungeonId: "meadow", difficultyId: "normal", success: true,
      completedAt: Date.now() - 100000 - characterIndex * 1000 - index,
      partySetup: [{ id: ids[characterIndex], name: `冒険者${String(characterIndex + 1).padStart(2, "0")}` }],
      battle: { members: [{ id: ids[characterIndex], name: `冒険者${String(characterIndex + 1).padStart(2, "0")}` }] }
    });
  });
  game.Characters.recordRouteMentorship(fieldGuide, { role: "apprentice", partnerCharacterId: ids[3], dungeonId: "meadow", difficultyId: "normal", completedAt: Date.now() - 5000 });
  game.Characters.recordRouteMentorship(game.Characters.get(ids[3]), { role: "mentor", partnerCharacterId: fieldGuide.id, dungeonId: "meadow", difficultyId: "normal", completedAt: Date.now() - 5000 });
  game.Characters.recordRouteMentorship(fieldGuide, { role: "mentor", partnerCharacterId: ids[1], dungeonId: "meadow", difficultyId: "normal", completedAt: Date.now() - 4000 });
  game.Characters.recordRouteMentorship(game.Characters.get(ids[1]), { role: "apprentice", partnerCharacterId: fieldGuide.id, dungeonId: "meadow", difficultyId: "normal", completedAt: Date.now() - 4000 });
  game.GameState.data.partyPlans[0] = { dungeonId: "meadow", difficultyId: "normal", timeMultiplier: 1 };
  assert.strictEqual(game.Characters.recentExpeditionRole(game.Characters.get(ids[1])).title, "癒し手", "Repeatedly filling the same observed role should produce a narrative reputation without saved duplicate state");
  const reputationPanel = game.GameUIViews.results.adventurerReputationPanel({ newAdventurerReputations: [{ characterId: ids[1], name: "冒険者02", kind: "healing", label: "仲間の命をつないだ", title: "癒し手", icon: "灯", previousTitle: null }] }, { escape: value => String(value) });
  assert(reputationPanel.includes("NEW REPUTATION") && reputationPanel.includes("癒し手") && reputationPanel.includes('data-action="open-adventurer-record"'), "A newly established reputation should be celebrated in the return report and link back to the adventurer's history");
  const departureMoment = game.Characters.expeditionRoleConversation([
    { id: ids[1], name: "冒険者02", reputation: { kind: "healing", label: "仲間の命をつないだ", title: "癒し手", icon: "灯" } },
    { id: ids[2], name: "冒険者03", reputation: null }
  ]);
  const returnMoment = game.Characters.expeditionRoleConversation([game.Characters.get(ids[1]), game.Characters.get(ids[2])]);
  const newPartyMoment = game.Characters.expeditionRoleConversationChange(departureMoment, returnMoment);
  assert.strictEqual(departureMoment, null, "A departure snapshot without two established roles should not borrow a later live reputation");
  assert(newPartyMoment && newPartyMoment.label === "先陣 × 癒し手" && newPartyMoment.text.includes("傷を隠さないで"), "A newly compatible pair of reputations should create a party dynamic");
  assert.strictEqual(game.Characters.expeditionRoleConversationChange(returnMoment, returnMoment), null, "An unchanged party dynamic should not be celebrated twice");
  const partyMomentPanel = game.GameUIViews.results.partyReputationMomentPanel({ newPartyReputationMoment: newPartyMoment }, { escape: value => String(value) });
  assert(partyMomentPanel.includes("NEW PARTY DYNAMIC") && partyMomentPanel.includes("冒険者03 × 冒険者02") && partyMomentPanel.includes("先陣 × 癒し手"), "The return report should present the people, paired roles and new conversation together");
  const successfulReturn = game.Characters.expeditionRoleReturnConversation([game.Characters.get(ids[1]), game.Characters.get(ids[2])], true, 0);
  const failedReturn = game.Characters.expeditionRoleReturnConversation([game.Characters.get(ids[1]), game.Characters.get(ids[2])], false, 0);
  assert(successfulReturn?.text.includes("今日は合格") && failedReturn?.text.includes("前へ出すぎた"), "Party-role conversations should react differently to a successful return and a retreat");
  const returnMomentPanel = game.GameUIViews.results.partyReturnMomentPanel({ partyReturnMoment: successfulReturn }, { escape: value => String(value) });
  assert(returnMomentPanel.includes("ON THE WAY HOME") && returnMomentPanel.includes("帰路のひと幕") && returnMomentPanel.includes("先陣 × 癒し手"), "The return report should surface the party's outcome-specific exchange in a compact scene");
  const lootReaction = game.Dungeon.lootReaction([
    { itemId: "iron_sword", displayName: "上質な鉄の剣", qualityId: "fine", newDiscovery: true }
  ], [
    { id: ids[1], name: "冒険者02", reputation: { kind: "healing", label: "仲間の命をつないだ", title: "癒し手", icon: "灯" } },
    { id: ids[2], name: "冒険者03", reputation: { kind: "damage", label: "敵陣を切り開いた", title: "先陣", icon: "刃" } }
  ]);
  assert(lootReaction && lootReaction.characterId === ids[2] && lootReaction.itemName === "上質な鉄の剣" && lootReaction.text.includes("重心"), "A notable weapon discovery should draw a fitting reaction from the party's established vanguard");
  assert.strictEqual(game.Dungeon.lootReaction([{ itemId: "iron_sword", displayName: "鉄の剣" }], [{ id: ids[2], name: "冒険者03", reputation: null }]), null, "Ordinary known loot should not add repetitive narrative cards");
  const lootReactionPanel = game.GameUIViews.results.lootReactionPanel({ lootReaction }, { escape: value => String(value) });
  assert(lootReactionPanel.includes("戦利品を囲んで") && lootReactionPanel.includes("冒険者03 · 先陣") && lootReactionPanel.includes("上質な鉄の剣"), "The return report should connect notable loot to the adventurer who examined it");
  const harvestPracticePanel = game.GameUIViews.results.targetedHarvestPracticePanel({ newTargetedHarvestPractices: [{ characterId: ids[0], name: "冒険者01", monsterId: harvestMonsterId, itemId: harvestItemId, tierId: "known_quarry", tierName: "獲物の癖を知る", successes: 3 }] }, { escape: value => String(value) });
  assert(harvestPracticePanel.includes("HUNTING PRACTICE") && harvestPracticePanel.includes("冒険者01") && harvestPracticePanel.includes("獲物の癖を知る") && harvestPracticePanel.includes('data-action="open-adventurer-record"'), "A newly learned exact-pair hunting practice should be celebrated as a personal return story");
  const harvestPersistencePanel = game.GameUIViews.results.targetedHarvestPersistencePanel({ newTargetedHarvestPersistences: [{ characterId: ids[0], name: "冒険者01", monsterId: harvestMonsterId, itemId: harvestItemId, tierId: "trace_reader", tierName: "空振りの痕跡を読む", misses: 3 }] }, { escape: value => String(value) });
  assert(harvestPersistencePanel.includes("FIELD CLUE FOUND") && harvestPersistencePanel.includes("冒険者01") && harvestPersistencePanel.includes("空振りの痕跡を読む") && harvestPersistencePanel.includes('data-action="open-adventurer-record"'), "A newly learned failed-harvest clue should turn an empty return into visible personal progress");
  game.UI.init(); game.UI.navigate("party");
  assert(node("app").innerHTML.includes("冒険の準備") && node("app").innerHTML.includes("パーティを編成する"));
  await click("party-open", { party: "0", view: "formation" });
  let html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="roster-row'), 20, "Only one roster page should render");
  assert(html.includes('class="compact-filter-panel roster-filter-panel" data-detail="party-roster-filters"'), "Party roster filters should retain their open state between roster updates");
  assert(html.includes("1 / 3ページ · 45人") && html.includes("冒険者01") && !html.includes("冒険者45"));
  const first = game.Characters.get(ids[0]), firstStat = game.Characters.stats(first);
  assert(html.includes(`<strong>冒険者01</strong><small>戦士 · 人間 · Lv.${first.level}</small>`) && html.includes(`HP <strong>${firstStat.hp}</strong>`) && html.includes(`重量 <strong>0/${game.Characters.maxWeight(first)}</strong>`), "Roster should show compact identity, HP and current/max equipment weight");
  assert(html.includes('placeholder="名前・職業・種族・探索経験・狙い採り・近頃の働き・旅仲間・得意技能"') && html.includes('class="roster-route-specialty"') && html.includes("探索 <strong>隠し道・ほか1種</strong>") && html.includes('class="roster-recent-role"') && html.includes("近頃 <strong>癒し手</strong>"), "Roster rows turn repeated observed roles into compact narrative reputations without adding another vertical row");
  assert(html.includes('data-roster-filter="route"') && html.includes('value="hidden_passage"') && html.includes('value="treasure_opening"') && html.includes('value="targeted_harvest"') && html.includes('value="route"') && html.includes('value="harvest"'), "Large rosters can filter and sort by earned route, opening and targeted-harvest experience");
  assert(html.includes('class="roster-current-harvest"') && html.includes("現在の狙い採り") && html.includes("組み合わせ経験 1人・手覚え 1人・痕跡 1人"), "The roster should summarize how many adventurers know the exact currently tracked quarry and fixed-drop pair");
  assert(html.includes('class="roster-current-harvest roster-current-destination"') && html.includes("現在の攻略先") && html.includes("土地勘 3人・編成中 0人・案内役 1人・継承途中 1人・継承案内役 1人"), "Formation shows destination familiarity and exact-route inheritance progress across the guild");
  assert(html.includes('class="roster-mentorship-specialty is-inherited-guide"') && html.includes("継承案内役 <strong>師 冒険者04・教え子 冒険者02</strong>"), "A former apprentice who became a guide should be recognizable in the roster for the saved exact route");
  assert(html.includes("教わった道 <strong>師 冒険者01・案内役まであと7回</strong>"), "An apprentice should show the number of exact-route clears still needed to become a guide");
  assert(html.includes('value="current_destination"') && html.includes("現在の攻略先") && html.includes('value="destination"') && html.includes("攻略先経験順"), "A saved destination adds exact-route roster filter and sort controls");
  assert(html.includes('value="current_harvest"') && html.includes("現在の狩り経験順"), "An active combined field target should add exact-pair filter and sort controls");
  await click("toggle-party", { character: ids[0] });
  await click("toggle-party", { character: ids[1] });
  html = node("app").innerHTML;
  assert(html.includes('class="current-destination-party-state is-reunion"') && html.includes("道を結んだ二人が再訪") && html.includes("冒険者01 ↔ 冒険者02"), "Putting an exact-route mentor and apprentice together should surface their reunion before departure");
  assert(html.includes('class="slot-route-mentorship is-inherited-guide"') && html.includes("継承案内役 · 師 冒険者04・教え子 冒険者02"), "Formation slots should retain the route lineage cue after adding the guide");
  await click("toggle-party", { character: ids[0] });
  await click("toggle-party", { character: ids[1] });
  await listeners.change({ target: { value: "hidden_passage", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="roster-row'), 1, "A route specialty filter isolates adventurers with matching field practice");
  assert(html.includes('<span class="roster-name"><strong>冒険者01</strong>'));
  await listeners.change({ target: { value: "treasure_opening", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="roster-row'), 1, "The opening specialty filter isolates veteran chest openers");
  assert(html.includes('<span class="roster-name"><strong>冒険者01</strong>'));
  await listeners.change({ target: { value: "targeted_harvest", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="roster-row'), 1, "The targeted-harvest filter isolates adventurers who have joined an observed hunt");
  assert(html.includes("冒険者01") && html.includes('class="roster-harvest-specialty"') && html.includes("狩り <strong>3/6回・7点</strong>"), "A hunter's successful returns, attempts and recovered quantity remain compact and factual");
  await listeners.change({ target: { value: "harvest", dataset: { rosterFilter: "sort" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert(html.includes('<option value="harvest" selected>狙い採り経験順</option>'), "The same personal hunting record can order formation candidates without implying a hidden combat bonus");
  await listeners.change({ target: { value: "current_harvest", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="roster-row'), 1, "The current-harvest filter should isolate adventurers who practiced this exact monster-and-item pair");
  assert(html.includes("冒険者01") && html.includes("対象 <strong>3/6回・7点・手覚え 獲物の癖を知る・痕跡 空振りの痕跡を読む</strong>"), "The matching adventurer should show paired results plus earned success practice and failure-trace names without exposing their multipliers");
  await listeners.change({ target: { value: "current_harvest", dataset: { rosterFilter: "sort" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert(html.includes('<option value="current_harvest" selected>現在の狩り経験順</option>'), "The exact paired record can order candidates without revealing its internal loot multiplier");
  await listeners.change({ target: { value: "all", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  await listeners.change({ target: { value: "destination", dataset: { rosterFilter: "sort" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  const destinationRosterHtml = html.slice(html.indexOf('<div class="roster-list">'), html.indexOf('<nav class="pagination"'));
  assert(html.includes('<option value="destination" selected>攻略先経験順</option>') && html.includes('class="roster-destination-specialty"') && html.includes("土地 <strong>案内役・攻略10回</strong>"), "Destination sorting surfaces the adventurer's route rank without exposing its hidden probability bonus");
  assert.strictEqual(destinationRosterHtml.match(/<span class="roster-name"><strong>([^<]+)/)?.[1], "冒険者01", "The most experienced guide for the saved destination is suggested first");
  await listeners.change({ target: { value: "current_destination", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="roster-row'), 3, "The destination filter isolates adventurers who have actually cleared that exact route and difficulty");
  await listeners.change({ target: { value: "current_lineage", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  await listeners.change({ target: { value: "lineage", dataset: { rosterFilter: "sort" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  const lineageRosterHtml = html.slice(html.indexOf('<div class="roster-list">'), html.indexOf('<nav class="pagination"'));
  assert.strictEqual(count(html, 'class="roster-row'), 2, "The route-lineage filter should isolate adventurers who learned this exact route from someone else");
  assert(html.includes('<option value="current_lineage" selected>帰り道の継承</option>') && html.includes('<option value="lineage" selected>継承進捗順</option>'), "Exact-route inheritance should have dedicated filter and progress sort controls");
  assert.strictEqual(lineageRosterHtml.match(/<span class="roster-name"><strong>([^<]+)/)?.[1], "冒険者01", "A completed inherited guide should appear before apprentices still training on the route");
  await listeners.change({ target: { value: "all", dataset: { rosterFilter: "route" }, hasAttribute: key => key === "data-roster-filter" } });
  await listeners.change({ target: { value: "level", dataset: { rosterFilter: "sort" }, hasAttribute: key => key === "data-roster-filter" } });
  node(".main-area").scrollTop = 780;
  await click("roster-page", { page: "2" });
  html = node("app").innerHTML;
  assert.strictEqual(node(".main-area").scrollTop, 0, "Changing roster pages should return to the roster heading");
  assert.strictEqual(count(html, 'class="roster-row'), 5);
  assert(html.includes("3 / 3ページ · 45人") && html.includes("冒険者45"));
  await click("select-party-character", { character: ids[44] });
  let modal = node("modal-root").innerHTML;
  assert(modal.includes("冒険者45の装備") && modal.includes("編成へ"));
  await click("close-modal");
  await click("toggle-party", { character: ids[44] });
  assert.strictEqual(game.Party.ids()[0], ids[44]);
  html = node("app").innerHTML;
  const member = game.Characters.get(ids[44]);
  assert(html.includes(`<strong>冒険者45</strong><small>${game.Characters.jobName(member)} · 人間 · Lv.${member.level}</small><small class="slot-vitals`) && html.includes(`重量 0/${game.Characters.maxWeight(member)}`), "Formation slots should show current/max equipment weight with compact identity and HP");
  assert(game.Presets.save(0, "装備試験").ok);
  member.level = 40;
  member.birthId = "guard";
  member.expeditionRecord.skillRecords.power_strike = { uses: 55, damage: 900, healing: 0, statuses: 0 };

  for (let index = 0; index < 30; index += 1) game.Items.add("iron_sword", 1, { source: "test", qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
  await click("open-equipment", { character: ids[44] });
  modal = node("modal-root").innerHTML;
  assert(modal.includes("装備名・スキル名") && modal.includes("おすすめ") && modal.includes("3種 · 32点"));
  assert(modal.includes("冒険者 ＋ 装備 ＝ 合計") && modal.includes("最大HP") && modal.includes("物理攻撃") && modal.includes("魔法攻撃") && modal.includes("命中率") && modal.includes("攻撃回数") && modal.includes("物理攻撃威力"), "Equipment screen should show the complete combat stat breakdown");
  assert(modal.includes('class="equipment-persistent-weight"') && modal.includes("装備重量") && modal.includes(`0 / ${game.Characters.maxWeight(member)}`), "Current/max equipment weight should remain in the sticky equipment header");
  assert(modal.includes('class="equipment-character-identity"') && modal.indexOf('class="equipment-character-identity"') < modal.indexOf('class="equipment-persistent-weight"') && modal.indexOf('class="equipment-persistent-weight"') < modal.indexOf('class="attribute-radar-card'), "Character portrait and identity should appear above weight and primary attributes");
  assert(modal.includes('data-action="open-party-presets"') && modal.includes("編成プリセット"), "A party member's equipment screen should link to the existing full party preset workflow");
  await click("open-party-presets", { party: "0" });
  assert(node("app").innerHTML.includes("隊列・装備・行動率をまとめて保存") && node("app").innerHTML.includes('class="preset-record"') && node("app").innerHTML.includes("装備試験") && node("app").innerHTML.includes("装備0点 · 重量0") && node('[data-detail="presets"]').open === true && !node("modal-root").innerHTML, "The equipment route should open the selected party's compact preset section directly");
  await click("open-equipment", { character: ids[44] });
  modal = node("modal-root").innerHTML;
  assert(modal.includes("<h4>技</h4>") && modal.includes("<h4>呪文</h4>") && modal.includes("<h4>回復</h4>") && !modal.includes("使用できるスキル") && modal.includes("強撃") && modal.includes("習得元："), "Equipment screen should separate techniques, spells and healing");
  assert(modal.includes('class="equipment-skill-mastery"') && modal.includes("得意技 · 55回") && modal.includes("次の呼び名「十八番」まで145回"), "Equipment planning shows the character's actual familiarity beside each practiced skill without opening a separate screen");
  assert.strictEqual(count(modal, 'type="range"'), 4, "All four action rates should use sliders");
  assert(modal.includes("優先順 回復 → 呪文 → 技 → 攻撃") && modal.includes("すべての判定に失敗した場合は防御") && modal.includes("合計値の制限はありません"), "Action rate sliders should explain the sequential independent checks");
  const sliderValues = [50, 25, 20, 15], sliderOutput = { textContent: "" }, totalOutput = { textContent: "", classList: { toggle() {} } }, saveButton = { disabled: false };
  const sliders = sliderValues.map(value => ({ value }));
  const rateForm = { querySelectorAll: () => sliders, querySelector: selector => selector === "[data-action-rate-total]" ? totalOutput : saveButton };
  listeners.input({ target: { value: "50", name: "attack", hasAttribute: key => key === "data-action-rate-slider", closest: () => rateForm, parentElement: { querySelector: () => sliderOutput }, setAttribute() {} } });
  assert.strictEqual(sliderOutput.textContent, "50%");
  assert.strictEqual(totalOutput.textContent, "", "Changing a slider should not calculate a combined total");
  assert.strictEqual(saveButton.disabled, false, "Independent action rates should always remain saveable within each slider range");
  assert(modal.includes("特性・装備効果") && modal.includes("後方守護") && modal.includes("習得元：戦士"), "Passive job, race, birth and equipment effects should share the trait section");
  assert(modal.includes("臨機の一撃") && modal.includes("習得元：人間") && modal.includes("衛兵の家"), "Race and birth skill sources should remain visible after category separation");
  assert(modal.includes('<details class="equipment-ability-entry"><summary>') && !modal.includes('<details class="equipment-ability-entry" open>'), "Skill names should be compact rows whose descriptions stay closed until tapped");
  assert.strictEqual(count(modal, 'class="button primary equipment-quick-equip"'), 3, "Identical equipment candidates render as one stack");
  assert(!modal.includes("重量効率") && !modal.includes("役割性能/重量") && !modal.includes("重量1あたり性能") && !modal.includes('value="efficiency"') && modal.includes("×30") && modal.includes("編成へ") && node("app").innerHTML.includes('class="formation-equip"'), "Character equipment screen should keep grouped direct actions without exposing internal weight-efficiency scores or sorting");
  assert(["細剣", "剣", "刀", "弓", "杖", "布装備", "革装備", "重装備", "盾", "小手"].every(name => modal.includes(`>${name}</option>`)), "Equipment picker should expose every weapon and armor type in one compact filter");
  const originalJob = member.jobId, originalLevel = member.level;
  member.jobId = "mage"; member.level = 1;
  await listeners.change({ target: { value: "available", dataset: { equipmentFilter: "fit" }, hasAttribute: key => key === "data-equipment-filter" } });
  modal = node("modal-root").innerHTML;
  assert(modal.includes('id="equipment-picker-fit"') && modal.includes('<option value="available" selected>装備可能</option>') && !modal.includes("重量超過です"), "The equipment picker can show only items that fit the current remaining weight");
  await listeners.change({ target: { value: "overweight", dataset: { equipmentFilter: "fit" }, hasAttribute: key => key === "data-equipment-filter" } });
  modal = node("modal-root").innerHTML;
  assert(modal.includes('<option value="overweight" selected>重量超過</option>') && modal.includes("重量超過です"), "The equipment picker can isolate overweight candidates for loadout planning");
  member.jobId = originalJob; member.level = originalLevel;
  await listeners.change({ target: { value: "all", dataset: { equipmentFilter: "fit" }, hasAttribute: key => key === "data-equipment-filter" } });
  await listeners.change({ target: { value: "weapon:sword", dataset: { equipmentFilter: "kind" }, hasAttribute: key => key === "data-equipment-filter" } });
  modal = node("modal-root").innerHTML;
  assert(modal.includes('<option value="weapon:sword" selected>剣</option>') && modal.includes("2種 · 31点") && !modal.includes("布の服</strong>"), "Equipment picker should filter by the exact equipment type without losing grouped stacks");
  await click("close-modal");
  await click("open-equipment", { character: ids[43] });
  modal = node("modal-root").innerHTML;
  assert(!modal.includes('<option value="weapon:sword" selected>剣</option>'), "A different character should start with its own equipment picker view");
  await click("close-modal");
  await click("open-equipment", { character: ids[44] });
  modal = node("modal-root").innerHTML;
  assert(modal.includes('<option value="weapon:sword" selected>剣</option>') && modal.includes("2種 · 31点"), "Each character should restore their previous equipment filters when reopened");
  node("equipment-picker-query").value = "存在しない装備";
  await listeners.submit({ target: { id: "equipment-picker-form" }, preventDefault() {} });
  modal = node("modal-root").innerHTML;
  assert(modal.includes("条件に合う装備がありません") && modal.includes("すべての装備を表示") && modal.includes('data-action="reset-equipment-filters"'), "An empty equipment search should provide a direct route back to all equipment");
  await click("reset-equipment-filters");
  modal = node("modal-root").innerHTML;
  assert(modal.includes("3種 · 32点") && modal.includes('class="button ghost equipment-reset-button" type="button" data-action="reset-equipment-filters" disabled'), "Resetting equipment filters should restore the complete list and default controls");
  node("equipment-picker-query").value = "鉄の剣";
  await listeners.submit({ target: { id: "equipment-picker-form" }, preventDefault() {} });
  modal = node("modal-root").innerHTML;
  assert(modal.includes("1種 · 30点") && modal.includes("×30") && !modal.includes("木の剣</strong>"));
  const skilled = game.Items.add("iron_sword", 1, { source: "test", qualityId: "standard", modifiers: { hp: 0, attack: 3, defense: 0 } }).instances[0];
  assert(game.Items.equip(ids[44], skilled.id).ok);
  await click("open-equipment", { character: ids[44] });
  modal = node("modal-root").innerHTML;
  const breakdown = game.Characters.statBreakdown(member);
  assert(modal.includes(`<span>${breakdown.base.attack}</span><i>+</i><b class="positive">${breakdown.equipment.attack}</b><i>=</i><strong>${breakdown.total.attack}</strong>`), "Stat rows should render character + effective equipment contribution = final value");
  assert(modal.includes("物理攻撃力1.05倍"), "Equipment skill name should be visible");
  assert(modal.includes("装備元：鉄の剣"), "Equipment skill source should be visible");
  const setStaff = game.Items.add("greenwood_staff", 1, { source: "test", qualityId: "standard", modifiers: {} }).instances[0];
  game.Items.add("windrunner_vest", 1, { source: "test", qualityId: "standard", modifiers: {} });
  await click("reset-equipment-filters");
  modal = node("modal-root").innerHTML;
  assert(modal.includes('id="equipment-picker-set"') && modal.includes(">風渡りの旅装</option>"), "Discovered equipment sets should become available as a spoiler-safe picker filter");
  assert(modal.includes("装備後に変わる能力") && ["魔攻", "魔防", "魔回", "命中", "回避", "速度"].every(label => modal.includes(`<b>${label}</b>`)), "Expanded equipment candidates should show every changed combat stat, including magic and agility stats");
  await listeners.change({ target: { value: "windtrail_craft", dataset: { equipmentFilter: "set" }, hasAttribute: key => key === "data-equipment-filter" } });
  modal = node("modal-root").innerHTML;
  assert(modal.includes('<option value="windtrail_craft" selected>風渡りの旅装</option>') && modal.includes("若木の祈杖") && modal.includes("風走りの胴着") && modal.includes("2種 · 2点") && modal.includes("0 → 1 / 3"), "Set filtering should show only pieces that advance the selected combination");
  await click("equip-instance", { character: ids[44], instance: setStaff.id });
  modal = node("modal-root").innerHTML;
  assert(modal.includes("1 → 2 / 3") && modal.includes("新たに発動：風渡りの足並み"), "A candidate should preview the exact set threshold and effect it will activate");
  await click("reset-equipment-filters");
  game.Items.add("wolf_fang_bow", 1, { source: "test", qualityId: "standard", modifiers: {} });
  game.Items.add("golem_plate", 1, { source: "test", qualityId: "standard", modifiers: {} });
  await click("reset-equipment-filters");
  modal = node("modal-root").innerHTML;
  assert(modal.includes("基礎能力の変化") && modal.includes("技巧") && modal.includes("幸運") && modal.includes("+1"), "Rare equipment should preview direct primary-attribute changes before equipping");
  assert(modal.includes("基礎 技巧+1・幸運+1"), "Rare equipment should expose its primary-attribute identity without opening every candidate row");
  assert(modal.includes("耐性・属性の変化") && modal.includes("毒耐性") && modal.includes("火傷耐性") && modal.includes("凍寒耐性"), "Equipment candidates should preview derived ailment-resistance changes before equipping");
  await click("close-modal");
  game.GameState.data.adventurerBonds.pairs[[ids[43], ids[44]].sort().join("::")] = 20;
  await listeners.change({ target: { value: "bond", dataset: { rosterFilter: "sort" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  assert(html.includes('<option value="bond" selected>編成中の旅仲間順</option>') && html.includes('class="roster-bond-specialty"') && html.includes("旅仲間 <strong>冒険者45・20回</strong>"), "The roster surfaces a candidate's strongest relationship with the current lineup in one compact chip");
  const rosterHtml = html.slice(html.indexOf('<div class="roster-list">'), html.indexOf('<nav class="pagination"'));
  assert.strictEqual(rosterHtml.match(/<span class="roster-name"><strong>([^<]+)/)?.[1], "冒険者44", "Relationship sorting places the most familiar candidate first without exposing hidden combat numbers");
  await listeners.change({ target: { value: "skill", dataset: { rosterFilter: "sort" }, hasAttribute: key => key === "data-roster-filter" } });
  html = node("app").innerHTML;
  const skilledRosterHtml = html.slice(html.indexOf('<div class="roster-list">'), html.indexOf('<nav class="pagination"'));
  assert(html.includes('<option value="skill" selected>技能習熟順</option>') && html.includes('class="roster-skill-specialty"') && html.includes("得意 <strong>強撃・十八番</strong>"), "Formation planning can surface a veteran's most familiar skill in the existing compact stat row");
  assert.strictEqual(skilledRosterHtml.match(/<span class="roster-name"><strong>([^<]+)/)?.[1], "冒険者01", "Skill-mastery sorting places the most practiced adventurer first");
  await click("toggle-party", { character: ids[43] });
  html = node("app").innerHTML;
  assert(html.includes('class="acquisition-summary formation-bond-summary"') && html.includes("冒険者44") && html.includes("冒険者45") && html.includes("背中を預ける布陣") && !html.includes("statMultiplier"), "Formation planning shows an adjacent travel bond as a narrative clue without exposing internal numbers");
  console.log("Party/equipment UI test passed: unified desktop/mobile workflow, compact roster portraits, relationship and mastery clues, direct lineup equipment, one-tap equip, search and 24-item paging");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
