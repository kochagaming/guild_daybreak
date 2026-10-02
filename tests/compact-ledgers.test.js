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
function count(source, pattern) { return (source.match(new RegExp(pattern, "g")) || []).length; }
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, disabled: false, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? button : null } });
}

async function run() {
  game.GameState.reset();
  for (let index = 1; index <= 45; index += 1) create(game, `団員${String(index).padStart(2, "0")}`, index % 2 ? "warrior" : "mage");
  for (let index = 0; index < 30; index += 1) game.Items.add("iron_sword", 1, { source: "test", qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] });
  game.UI.init();

  game.UI.navigate("characters");
  let html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="character-card compact-record"'), 20, "Character directory renders one compact page");
  assert(html.includes("行を押すと能力・スキル・装備を表示します") && html.includes("1 / 3ページ · 45人"));
  assert(html.includes('class="compact-filter-panel directory-filter-panel" data-detail="character-directory-filters"') && html.includes("全職業・レベル順"), "Character directory filters expose current conditions and retain their open state");
  assert(html.includes("record-summary") && html.includes('data-action="open-character"') && !html.includes("character-detail-card"));
  node(".main-area").scrollTop = 780;
  await click("character-page", { page: "2" });
  html = node("app").innerHTML;
  assert.strictEqual(node(".main-area").scrollTop, 0, "Changing character pages should return to the character list heading");
  assert.strictEqual(count(html, 'class="character-card compact-record"'), 5);
  assert(html.includes("3 / 3ページ · 45人"));

  game.UI.navigate("inventory");
  html = node("app").innerHTML;
  const totalEquipment = game.Items.equipmentList().length;
  assert.strictEqual(count(html, 'class="owned-equipment equipment-stack compact-record'), 3, "Identical equipment renders as one stack");
  assert(html.includes(`3種 / 全${totalEquipment}点`) && html.includes("×30") && html.includes("同じ性能の装備はまとめて表示します"));
  assert(html.includes('class="compact-filter-panel inventory-filter-panel" data-detail="inventory-filters"') && html.includes("全種・全品質・新しい順"), "Inventory filter heading exposes the current conditions and can retain its open state");
  assert(html.includes('class="auto-sell-panel" data-detail="inventory-auto-sell"'), "Auto-sell settings have a stable open-state identity");
  assert(html.includes('class="panel inventory-material-panel" data-detail="inventory-materials"') && html.includes("1種 · 4点") && !html.includes('data-detail="inventory-materials" open'), "Materials stay in a compact expandable ledger with a visible total");
  node(".main-area").scrollTop = 610;
  await listeners.change({ target: { checked: true, hasAttribute: key => key === "data-auto-sell-enabled" } });
  assert.strictEqual(node(".main-area").scrollTop, 610, "Toggling auto-sell should preserve the inventory position");
  assert.strictEqual(game.AutoSell.state().enabled, true);
  const sellTarget = game.Items.equipmentList().find(item => item.templateId === "iron_sword");
  node(".main-area").scrollTop = 410;
  await click("request-sell", { instance: sellTarget.id });
  await click("confirm-item-action", { kind: "sell", instance: sellTarget.id });
  assert.strictEqual(node(".main-area").scrollTop, 410, "Selling an equipment instance should preserve the inventory position");

  game.UI.navigate("shop");
  html = node("app").innerHTML;
  assert(html.includes("item-card compact-item shop-item-card") && html.includes("shop-stat-scroll"));
  assert(html.includes("equipment-type-groups") && html.includes("細剣") && html.includes("命中・攻撃回数・速度") && html.includes("盾") && html.includes("防御力・HP"), "Shop groups products by equipment type and shows each role");
  ["HP", "物攻", "物防", "魔攻", "魔防", "魔回復", "命中", "速度", "攻撃回数", "重量"].forEach(label => assert(html.includes(`<small>${label}</small>`), `Shop displays non-zero ${label}`));
  assert(html.includes("<small>回避</small>") && !html.includes("<small>射程</small>"), "Shop shows non-zero evasion but omits duplicate range");
  assert(html.includes("固有スキル：物理攻撃威力+3%") && html.includes("木の剣") && html.includes("+4"));
  game.GameState.data.story.completed = game.GameData.storyChapters.map(chapter => chapter.id);
  game.UI.navigate("shop");
  html = node("app").innerHTML;
  assert(html.includes("shop-stock-history") && html.includes("過去の品を表示") && html.includes("14点"), "A fully unlocked shop keeps only the latest two tiers visible in each equipment type");
  game.UI.navigate("blacksmith");
  html = node("app").innerHTML;
  assert(html.includes("鍛冶メニュー") && html.includes("装備を製作する") && html.includes("装備を強化する"));
  assert(!html.includes("blacksmith-controls") && !html.includes("upgrade-record"), "Blacksmith menu keeps both long lists closed");
  await click("blacksmith-open", { view: "craft" });
  html = node("app").innerHTML;
  assert(html.includes("blacksmith-controls") && html.includes("forge-shop-card") && html.includes("blacksmith-shop-sections") && html.includes("forge-stat-list") && !html.includes("upgrade-record"));
  assert(html.includes("equipment-type-group") && html.includes("杖") && html.includes("魔法攻撃・魔法回復"), "Blacksmith groups recipes by result equipment type");
  assert(html.includes("この装備の固有スキル") && html.includes("有効なステータス"));
  assert(!html.includes("比較する冒険者") && !html.includes("blacksmith-inspector"), "Blacksmith no longer includes character comparison or a separate inspector");
  await click("blacksmith-back"); await click("blacksmith-open", { view: "upgrade" });
  html = node("app").innerHTML;
  assert(html.includes("upgrade-record") && html.includes("upgrade-controls") && !html.includes("forge-shop-card") && html.includes("鍛冶メニュー"), "Upgrade has its own route, filters and back navigation");
  assert(html.includes('class="compact-filter-panel blacksmith-filter-panel" data-detail="blacksmith-upgrade-filters"') && html.includes("全種・全状態・強化可能順"), "Upgrade filters expose current conditions and retain their open state");
  assert.strictEqual(count(html, 'class="commission-card compact-record upgrade-record"'), 3, "Identical equipment is grouped on the upgrade screen");
  assert(html.includes("×29") && html.includes("強化する個体を選ぶ") && html.includes("3種（31点）"), "Upgrade groups show stack counts and individual selection");
  const upgradeTarget = game.Items.equipmentList().find(item => item.templateId === "iron_sword");
  const upgradeQuote = game.Upgrades.quote(upgradeTarget.id);
  game.GameState.data.gold = Math.max(game.GameState.data.gold, upgradeQuote.gold + 1000);
  Object.entries(upgradeQuote.materials).forEach(([itemId, amount]) => game.Items.add(itemId, amount, { source: "test" }));
  node(".main-area").scrollTop = 530;
  await click("request-upgrade", { instance: upgradeTarget.id });
  await click("confirm-upgrade");
  assert.strictEqual(node(".main-area").scrollTop, 530, "Confirming an upgrade should preserve the upgrade-list position");
  assert.strictEqual(game.Items.getInstance(upgradeTarget.id).upgradeLevel, 1);
  const styles = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
  assert(styles.includes(".inventory-filter-panel:not([open]),") && styles.includes(".blacksmith-filter-panel:not([open]),") && styles.includes(".directory-filter-panel:not([open]),") && styles.includes(".roster-filter-panel:not([open]) { position: sticky; top: 0;"), "Collapsed inventory, crafting, character and roster filters remain reachable while scrolling on mobile");
  assert(!styles.includes(".forge-shop-card > summary { grid-template-columns: 34px"), "Mobile recipe rows must not reserve a hidden icon column");
  assert(styles.includes(".forge-shop-card > summary { grid-template-columns: minmax(0,1fr) auto") && styles.includes(".forge-shop-card .item-icon { display: none; }"), "Mobile recipe rows give the item summary the full available width");
  console.log("Compact ledgers test passed: collapsed character/equipment rows, directory/inventory paging, compact shop-style crafting catalog and upgrade views");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
