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
  assert(html.includes("record-summary") && html.includes('data-action="open-character"') && !html.includes("character-detail-card"));
  await click("character-page", { page: "2" });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="character-card compact-record"'), 5);
  assert(html.includes("3 / 3ページ · 45人"));

  game.UI.navigate("inventory");
  html = node("app").innerHTML;
  const totalEquipment = game.Items.equipmentList().length;
  assert.strictEqual(count(html, 'class="owned-equipment equipment-stack compact-record'), 3, "Identical equipment renders as one stack");
  assert(html.includes(`3種 / 全${totalEquipment}点`) && html.includes("×30") && html.includes("同じ性能の装備はまとめて表示します"));

  game.UI.navigate("shop");
  html = node("app").innerHTML;
  assert(html.includes("item-card compact-item shop-item-card") && html.includes("shop-stat-scroll"));
  assert(html.includes("equipment-type-groups") && html.includes("細剣") && html.includes("命中・攻撃回数・速度") && html.includes("盾") && html.includes("防御力・HP"), "Shop groups products by equipment type and shows each role");
  ["HP", "物攻", "物防", "魔攻", "魔防", "魔回復", "命中", "速度", "攻撃回数", "重量"].forEach(label => assert(html.includes(`<small>${label}</small>`), `Shop displays non-zero ${label}`));
  assert(!html.includes("<small>回避</small>") && !html.includes("<small>射程</small>"), "Shop omits zero stats and duplicate range");
  assert(html.includes("固有スキル：物理攻撃威力+3%") && html.includes("木の剣") && html.includes("+4"));
  game.UI.navigate("blacksmith");
  html = node("app").innerHTML;
  assert(html.includes("blacksmith-controls") && html.includes("forge-shop-card") && html.includes("blacksmith-shop-sections") && html.includes("upgrade-record") && html.includes("forge-stat-list"));
  assert(html.includes("equipment-type-group") && html.includes("杖") && html.includes("魔法攻撃・魔法回復"), "Blacksmith groups recipes by result equipment type");
  assert(html.includes("この装備の固有スキル") && html.includes("有効なステータス"));
  assert(!html.includes("比較する冒険者") && !html.includes("blacksmith-inspector"), "Blacksmith no longer includes character comparison or a separate inspector");
  const styles = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
  assert(!styles.includes(".forge-shop-card > summary { grid-template-columns: 34px"), "Mobile recipe rows must not reserve a hidden icon column");
  assert(styles.includes(".forge-shop-card > summary { grid-template-columns: minmax(0,1fr) auto") && styles.includes(".forge-shop-card .item-icon { display: none; }"), "Mobile recipe rows give the item summary the full available width");
  console.log("Compact ledgers test passed: collapsed character/equipment rows, directory/inventory paging, compact shop-style crafting catalog and upgrade views");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
