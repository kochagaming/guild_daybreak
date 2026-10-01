const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { id, innerHTML: "", textContent: "", value: "", focus() {}, classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
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
async function run() {
  game.GameState.reset();
  require("./helpers").createCharacter(game, "所持品確認役");
  const instance = game.Items.add("iron_sword", 1, { source: "test", modifiers: { hp: 8, attack: 3, defense: 2 }, equipmentSkills: ["physical_power_3"] }).instances[0];
  game.UI.init(); game.UI.navigate("inventory");
  const html = node("app").innerHTML;
  assert(!html.includes("比較する冒険者") && !html.includes("EQUIPMENT COMPARISON"));
  assert(!html.includes('data-action="inventory-equip"') && !html.includes("装備スキルの変化"));
  assert(html.includes("共通性能・追加効果") && html.includes("物理攻撃威力+3%"));
  assert(html.includes("剣 · 近接 · 品質：標準"), "Inventory rows show equipment type, range and quality separately");
  assert(html.includes("品質：標準 ×1") && html.includes("神がかった ×5") && html.includes("品質倍率を確認"), "Compact quality multipliers are visible in inventory rows and the collapsible guide");
  assert(html.includes('class="equipment-stat-chips"') && html.includes("<small>物理攻撃</small>") && html.includes("<small>魔法攻撃</small>") && html.includes("<small>命中精度</small>"));
  const stats = html.slice(html.indexOf('class="equipment-stat-chips"'), html.indexOf('class="equipment-stat-chips"') + 1200);
  const order = ["HP", "物理攻撃", "魔法攻撃", "物理防御", "魔法防御", "魔法回復", "命中精度", "回避", "速度", "攻撃回数", "重量"];
  order.slice(1).forEach((label, index) => assert(stats.indexOf(order[index]) < stats.indexOf(label), `${label} follows ${order[index]}`));
  assert(!html.includes('<div class="owned-stats">') && !html.includes('<div class="bonus-chips">'));
  assert(html.includes(`data-instance="${instance.id}"`) && html.includes("同じ性能を自動売却") && html.includes("まとめて売る"));
  assert.strictEqual(game.Characters.get("adventurer-1").equipment.length, 0);
  console.log("Inventory focus test passed: adventurer comparison and direct equip removed while equipment details and management remain");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
