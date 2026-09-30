const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = Date.parse("2026-09-28T12:00:00+09:00");
const context = vm.createContext({ window: {}, Date, Math, Blob, console });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
  if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
}
const game = context.window;

async function run() {
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok, "未同期の新規セーブも検証できること");
  const synced = await game.GameClient.execute("progress.sync");
  assert(synced.ok && synced.shopChanged, "初回同期で日替わり商品を生成すること");
  const offers = game.Shop.dailyStock();
  assert.strictEqual(offers.length, 10, "日替わり商品を常に10点生成すること");
  offers.forEach((offer, index) => {
    assert.strictEqual(offer.id, `daily-${game.Shop.dateKey(now)}-${index + 1}`);
    assert(game.GameState.data.encyclopedia.items[offer.templateId] > 0, "入手済み装備だけを販売すること");
    assert(["weapon", "armor"].includes(game.Items.template(offer.templateId).type));
    assert(Number.isInteger(offer.price) && offer.price > 0);
  });

  const snapshot = JSON.stringify(offers);
  const sameDay = await game.GameClient.execute("progress.sync");
  assert(sameDay.ok && !sameDay.shopChanged);
  assert.strictEqual(JSON.stringify(game.Shop.dailyStock()), snapshot, "同日中は品揃えと性能が変わらないこと");

  const plain = { templateId: "wooden_sword", qualityId: "standard", ultraRareTitleId: null, upgradeLevel: 0, modifiers: { hp: 0, attack: 0, defense: 0 }, source: "daily_shop" };
  const valuable = { ...plain, qualityId: "fine", modifiers: { hp: 10, attack: 3, defense: 2 } };
  assert(game.Shop.dailyPrice(valuable) > game.Shop.dailyPrice(plain), "品質と追加性能に応じて販売価格が上がること");

  const first = offers[0], goldBefore = game.GameState.data.gold;
  game.GameState.data.gold = first.price - 1;
  assert(!(await game.GameClient.execute("shop.daily.buy", { offerId: first.id })).ok, "所持金不足では購入できないこと");
  assert(!first.purchased);
  game.GameState.data.gold = goldBefore + 100000;
  const bought = await game.GameClient.execute("shop.daily.buy", { offerId: first.id });
  const purchasedOffer = game.Shop.dailyStock().find(offer => offer.id === first.id);
  assert(bought.ok && purchasedOffer.purchased, `日替わり商品を購入済みにすること: ${bought.message}`);
  assert.strictEqual(bought.instance.templateId, first.templateId);
  assert.strictEqual(bought.instance.qualityId, purchasedOffer.qualityId);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(bought.instance.modifiers)), JSON.parse(JSON.stringify(purchasedOffer.modifiers)), "表示された個体性能を保って購入できること");
  assert(!(await game.GameClient.execute("shop.daily.buy", { offerId: first.id })).ok, "同じ商品を二重購入できないこと");
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok, "日替わり商店を含むセーブを検証できること");

  const oldDate = game.GameState.data.dailyShop.dateKey;
  now += 25 * 60 * 60 * 1000;
  const refreshed = await game.GameClient.execute("progress.sync");
  assert(refreshed.ok && refreshed.shopChanged);
  assert.notStrictEqual(game.GameState.data.dailyShop.dateKey, oldDate);
  assert.strictEqual(game.Shop.dailyStock().length, 10);
  assert(game.Shop.dailyStock().every(offer => !offer.purchased), "翌日の商品は未購入状態で更新されること");

  const invalid = JSON.parse(JSON.stringify(game.GameState.data));
  invalid.dailyShop.offers[0].templateId = "steel_sword";
  delete invalid.encyclopedia.items.steel_sword;
  assert(!game.SaveTransfer.parse(JSON.stringify(invalid)).ok, "未入手装備を含む日替わりデータを拒否すること");
  console.log("Daily shop test passed: discovery-only stock, 10 deterministic offers, value pricing, one-time purchase, reset and validation");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
