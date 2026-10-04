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

  game.GameState.data.story.completed.push("prologue", "roadside");
  game.GameState.data.gold = 9999;
  game.Items.add("iron_ore", 3, { source: "test" });
  assert.strictEqual(game.Blacksmith.status(swordRecipe), "ready");
  assert(game.Blacksmith.query({ status: "ready" }).includes(swordRecipe));
  assert.strictEqual(game.Blacksmith.result(game.Blacksmith.query({ sort: "tierDesc" })[0]).tier, Math.max(...game.GameData.recipes.map(recipe => game.Blacksmith.result(recipe).tier || 0)));
  const catalogRecipes = game.Blacksmith.catalog({});
  const lockedCatalog = catalogRecipes.filter(recipe => game.Blacksmith.status(recipe) === "locked");
  const lockedCategories = lockedCatalog.map(recipe => game.Blacksmith.category(recipe));
  assert.strictEqual(new Set(lockedCategories).size, lockedCategories.length, "Only the next locked recipe is exposed per equipment type");
  assert(catalogRecipes.length < game.GameData.recipes.length, "Later locked recipes stay hidden from the catalog");
  assert(game.Blacksmith.hiddenLockedCount("weapon:sword") >= 0);

  create(game, "比較役", "warrior");
  game.UI.init();
  game.UI.navigate("blacksmith");
  let html = node("app").innerHTML;
  assert(html.includes("鍛冶メニュー") && html.includes('data-view="craft"') && html.includes('data-view="upgrade"'));
  assert(!html.includes("blacksmith-controls") && !html.includes("upgrade-record"), "Crafting and upgrading do not share the menu screen");
  await click("blacksmith-open", { view: "craft" });
  html = node("app").innerHTML;
  assert(html.includes("性能倍率は1〜5倍"), "Crafting explains that the resulting quality changes equipment performance");
  const recipeTypeIds = Array.from(game.GameData.equipmentTypes ? Object.values(game.GameData.equipmentTypes) : [], type => type.id)
    .filter(typeId => catalogRecipes.some(recipe => (game.Blacksmith.result(recipe).weaponType || game.Blacksmith.result(recipe).armorType) === typeId));
  const recipePages = Math.ceil(recipeTypeIds.length / 6);
  const recipesOnPage = page => catalogRecipes.filter(recipe => recipeTypeIds.slice(page * 6, (page + 1) * 6).includes(game.Blacksmith.result(recipe).weaponType || game.Blacksmith.result(recipe).armorType)).length;
  assert(html.includes('id="blacksmith-search-form"') && html.includes('data-blacksmith-filter="category"') && html.includes('data-blacksmith-filter="material"') && html.includes('data-blacksmith-filter="status"') && html.includes('data-blacksmith-filter="sort"'));
  assert(html.includes('class="compact-filter-panel blacksmith-filter-panel" data-detail="blacksmith-craft-filters"') && html.includes("全種・製作可能順"), "Crafting filters expose their current conditions and retain their open state");
  assert(html.includes('data-detail="blacksmith-craft-equipment-type-'), "Crafting categories use their own open-state namespace");
  assert.strictEqual(count(html, 'class="item-card compact-item shop-item-card forge-shop-card'), recipesOnPage(0), "A recipe page contains whole equipment-type groups");
  assert(html.includes(`1/${recipePages}ページ · ${recipeTypeIds.length}種・${catalogRecipes.length}件`) && html.includes("鉄鉱石") && html.includes("3/"));
  const firstPageTypes = Array.from(html.matchAll(/data-equipment-type="([^"]+)"/g), match => match[1]);
  assert.strictEqual(new Set(firstPageTypes).size, firstPageTypes.length, "An equipment type appears in only one group on a page");
  assert(html.includes('data-detail="blacksmith-craft-equipment-type-') && html.includes('data-detail="forge-recipe-'), "Recipe groups and open recipes have stable identities across background refreshes");
  assert(html.includes('class="recipe-set-mark"') && html.includes('class="recipe-set-preview') && html.includes("未記録の組合せ") && html.includes("0/3"), "Set recipes expose a compact, spoiler-safe collection preview");
  assert(html.includes("この装備の固有スキル") && html.includes("装備種別ごとに次に解放される1件") && !html.includes("比較する冒険者") && !html.includes("標準品質・追加性能なし"));
  assert(!html.includes("blacksmith-inspector") && !html.includes("data-blacksmith-compare"), "Character comparison and the separate inspector should be removed");
  await listeners.change({ target: { value: "armor:leather", dataset: { blacksmithFilter: "category" }, hasAttribute: key => key === "data-blacksmith-filter" } });
  html = node("app").innerHTML;
  assert(html.includes('data-action="track-recipe-material"') && html.includes("不足2個を探索目標"), "Unlocked recipes offer a direct target for missing materials");
  await click("track-recipe-material", { item: "slime_gel", targetQuantity: "2" });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Encyclopedia.trackedTarget())), { itemId: "slime_gel", quantity: 2, progress: 0 }, "Recipe-known materials can become targets before their first acquisition");
  await listeners.change({ target: { value: "weapon:sword", dataset: { blacksmithFilter: "category" }, hasAttribute: key => key === "data-blacksmith-filter" } });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="equipment-type-group"'), 1, "All sword recipes share one equipment-type frame");
  assert(html.includes("鉄の剣") && html.includes("鋼の剣"), "Unlocked and next-to-unlock swords are presented together");
  await click("reset-blacksmith-filters");

  if (recipePages > 1) {
    node(".main-area").scrollTop = 760;
    await click("recipe-page", { page: "1" });
    html = node("app").innerHTML;
    assert.strictEqual(node(".main-area").scrollTop, 0, "Changing recipe pages should return to the recipe catalog heading");
    assert.strictEqual(count(html, 'class="item-card compact-item shop-item-card forge-shop-card'), recipesOnPage(1));
    const secondPageTypes = Array.from(html.matchAll(/data-equipment-type="([^"]+)"/g), match => match[1]);
    assert(!secondPageTypes.some(type => firstPageTypes.includes(type)), "Equipment types are never split across recipe pages");
  }

  node("blacksmith-query").value = "鉄の剣";
  await listeners.submit({ target: { id: "blacksmith-search-form" }, preventDefault() {} });
  html = node("app").innerHTML;
  assert.strictEqual(count(html, 'class="item-card compact-item shop-item-card forge-shop-card'), 1);
  assert(html.includes("検索「鉄の剣」・全種・製作可能順"), "The collapsed crafting filter heading reflects the current search");
  assert(html.includes("鉄の剣") && html.includes("この装備を製作する"));

  await listeners.change({ target: { value: "locked", dataset: { blacksmithFilter: "status" }, hasAttribute: key => key === "data-blacksmith-filter" } });
  html = node("app").innerHTML;
  assert(html.includes("条件に一致するレシピがありません"), "Combined query and status filters are applied");
  await click("reset-blacksmith-filters");
  html = node("app").innerHTML;
  assert(html.includes(`1/${recipePages}ページ · ${recipeTypeIds.length}種・${catalogRecipes.length}件`));
  const ironSwordBefore = game.Items.count("iron_sword");
  node(".main-area").scrollTop = 520;
  await click("craft", { recipe: "forge_iron_sword" });
  html = node("app").innerHTML;
  assert.strictEqual(game.Items.count("iron_sword"), ironSwordBefore + 1);
  assert.strictEqual(node(".main-area").scrollTop, 520, "Crafting should preserve the current recipe-list position");
  game.GameState.data.encyclopedia.items.greenwood_staff = 1;
  game.UI.render(); html = node("app").innerHTML;
  assert(html.includes("風渡りの旅装") && html.includes("1/3") && html.includes("あと1種類の異なる装備"), "Known set pieces reveal the set name and next threshold without exposing unknown members");
  game.Items.add("beast_hide", 2, { source: "test" });
  game.Items.add("beast_sinew", 1, { source: "test" });
  game.Items.add("wind_grass", 1, { source: "test" });
  await click("craft", { recipe: "forge_windrunner_vest" });
  html = node("app").innerHTML;
  assert(html.includes('class="crafted-set-progress"') && html.includes("風渡りの旅装") && html.includes("1 → 2 / 3") && html.includes("新効果：風渡りの足並み"), "Crafting a threshold piece celebrates the newly discovered equipment-set effect");
  assert(html.includes("CRAFT COMPLETE") && html.includes("crafted-equipment-notice") && html.includes("所持品で確認") && html.includes("固有スキル："), "The crafted instance remains visible with its rolled quality, stats and skills");
  const craftedInstanceId = (html.match(/data-action="open-crafted-inventory" data-instance="([^"]+)"/) || [])[1];
  assert(craftedInstanceId && game.Items.getInstance(craftedInstanceId));
  await click("open-crafted-inventory", { instance: craftedInstanceId });
  html = node("app").innerHTML;
  assert(html.includes("装備品") && html.includes(game.Items.displayName(game.Items.getInstance(craftedInstanceId))) && html.includes("is-focused-equipment") && html.includes('data-focused-instance="true"') && html.includes("今回の製作品"), "The crafting result opens and highlights its exact inventory instance");
  console.log("Blacksmith catalog test passed: unlocked recipes plus one next unlock per equipment type, search, filters, paging and compact recipe details");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
