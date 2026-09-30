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
  assert(game.GameData.recipes.every(recipe => !Object.prototype.hasOwnProperty.call(recipe, "category")), "Recipes do not duplicate result-item categories");
  const swordRecipe = game.GameData.recipes.find(recipe => recipe.id === "forge_iron_sword");
  assert.strictEqual(game.Blacksmith.category(swordRecipe), "weapon:sword");
  assert.deepStrictEqual(Array.from(game.Blacksmith.query({ query: "鉄の剣" }), recipe => recipe.id), ["forge_iron_sword"]);
  assert(game.Blacksmith.query({ query: "鉄鉱石" }).every(recipe => recipe.materials.iron_ore), "Material-name search uses referenced item names");
  assert(game.Blacksmith.query({ category: "weapon:sword" }).every(recipe => game.Blacksmith.category(recipe) === "weapon:sword"));
  assert(game.Blacksmith.query({ material: "magic_stone" }).every(recipe => recipe.materials.magic_stone));
  assert.strictEqual(game.Blacksmith.status(swordRecipe), "locked");

  game.GameState.data.story.completed.push("roadside");
  game.GameState.data.gold = 9999;
  game.Items.add("iron_ore", 3, { source: "test" });
  assert.strictEqual(game.Blacksmith.status(swordRecipe), "ready");
  assert(game.Blacksmith.query({ status: "ready" }).includes(swordRecipe));
  assert.strictEqual(game.Blacksmith.result(game.Blacksmith.query({ sort: "tierDesc" })[0]).tier, Math.max(...game.GameData.recipes.map(recipe => game.Blacksmith.result(recipe).tier || 0)));

  create(game, "比較役", "warrior");
  game.UI.init();
  game.UI.navigate("blacksmith");
  let html = node("app").innerHTML;
  const recipePages = Math.ceil(game.GameData.recipes.length / 12);
  assert(html.includes('id="blacksmith-search-form"') && html.includes('data-blacksmith-filter="category"') && html.includes('data-blacksmith-filter="material"') && html.includes('data-blacksmith-filter="status"') && html.includes('data-blacksmith-filter="sort"'));
  assert.strictEqual(count(html, 'class="item-card compact-item shop-item-card forge-shop-card'), 12, "One recipe page contains at most twelve shop-style entries");
  assert(html.includes(`1/${recipePages}ページ · ${game.GameData.recipes.length}件`) && html.includes("鉄鉱石") && html.includes("3/"));
  assert(html.includes("この装備の固有スキル") && html.includes("商店と同じように品を一覧から選び") && !html.includes("比較する冒険者") && !html.includes("標準品質・追加性能なし"));
  assert(!html.includes("blacksmith-inspector") && !html.includes("data-blacksmith-compare"), "Character comparison and the separate inspector should be removed");

  await click("recipe-page", { page: "1" });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="item-card compact-item shop-item-card forge-shop-card'), Math.min(12, game.GameData.recipes.length - 12));

  node("blacksmith-query").value = "鉄の剣";
  await listeners.submit({ target: { id: "blacksmith-search-form" }, preventDefault() {} });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="item-card compact-item shop-item-card forge-shop-card'), 1);
  assert(html.includes("鉄の剣") && html.includes("この装備を製作する"));

  await listeners.change({ target: { value: "locked", dataset: { blacksmithFilter: "status" }, hasAttribute: key => key === "data-blacksmith-filter" } });
  html = node("app").innerHTML;
  assert(html.includes("条件に一致するレシピがありません"), "Combined query and status filters are applied");
  await click("reset-blacksmith-filters");
  html = node("app").innerHTML;
  assert(html.includes(`1/${recipePages}ページ · ${game.GameData.recipes.length}件`));
  console.log("Blacksmith catalog test passed: shop-style cards, derived categories, search, material/status filters, sorting, paging, compact costs and skill preview without character comparison");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
