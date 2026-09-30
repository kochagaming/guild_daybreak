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
  game.GameState.reset();
  const ids = [];
  for (let index = 1; index <= 45; index += 1) ids.push(create(game, `冒険者${String(index).padStart(2, "0")}`, index % 2 ? "warrior" : "mage").id);
  game.UI.init(); game.UI.navigate("party");
  assert(node("app").innerHTML.includes("冒険の準備") && node("app").innerHTML.includes("パーティを編成する"));
  await click("party-open", { party: "0", view: "formation" });
  let html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="roster-row'), 20, "Only one roster page should render");
  assert(html.includes("1 / 3ページ · 45人") && html.includes("冒険者01") && !html.includes("冒険者45"));
  const first = game.Characters.get(ids[0]), firstStat = game.Characters.stats(first);
  assert(html.includes(`<strong>冒険者01</strong><small>戦士 · 人間 · Lv.${first.level}</small>`) && html.includes(`HP <strong>${firstStat.hp}</strong>`) && html.includes(`重量 <strong>0/${game.Characters.maxWeight(first)}</strong>`), "Roster should show compact identity, HP and current/max equipment weight");
  assert(html.includes('placeholder="名前・職業・種族"'), "Roster search should include the visible race field");
  await click("roster-page", { page: "2" });
  html = node("app").innerHTML;
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
  member.level = 40;
  member.birthId = "guard";

  for (let index = 0; index < 30; index += 1) game.Items.add("iron_sword", 1, { source: "test", qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
  await click("open-equipment", { character: ids[44] });
  modal = node("modal-root").innerHTML;
  assert(modal.includes("装備名・スキル名") && modal.includes("おすすめ") && modal.includes("3種 · 32点"));
  assert(modal.includes("冒険者 ＋ 装備 ＝ 合計") && modal.includes("最大HP") && modal.includes("物理攻撃") && modal.includes("魔法攻撃") && modal.includes("命中率") && modal.includes("攻撃回数") && modal.includes("物理攻撃威力"), "Equipment screen should show the complete combat stat breakdown");
  assert(modal.includes('class="equipment-persistent-weight"') && modal.includes("装備重量") && modal.includes(`0 / ${game.Characters.maxWeight(member)}`), "Current/max equipment weight should remain in the sticky equipment header");
  assert(modal.includes("<h4>技</h4>") && modal.includes("<h4>呪文</h4>") && modal.includes("<h4>回復</h4>") && !modal.includes("使用できるスキル") && modal.includes("強撃") && modal.includes("習得元："), "Equipment screen should separate techniques, spells and healing");
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
  assert(modal.includes("同じ性能の装備は数量でまとめています") && modal.includes("×30") && modal.includes("編成へ") && node("app").innerHTML.includes('class="formation-equip"'), "Character equipment screen should keep grouped direct equipment actions and a route back to formation");
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
  console.log("Party/equipment UI test passed: unified desktop/mobile workflow, compact roster portraits, direct lineup equipment, one-tap equip, search and 24-item paging");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
