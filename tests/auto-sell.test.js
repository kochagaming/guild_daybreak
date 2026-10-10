const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");

(async function () {
  const root = path.resolve(__dirname, "..");
  const storage = new Map();
  const context = vm.createContext({ console, Date, Math, Blob, setTimeout, clearTimeout, window: {}, localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  } });
  context.window.window = context.window;
  context.window.localStorage = context.localStorage;
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = Array.from(html.matchAll(/<script defer src="([^"]+)"/g), match => match[1]);
  for (const file of scripts) {
    if (file === "js/portraitPress.js") break;
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  const game = context.window;
  const execute = (type, payload) => game.GameClient.execute(type, payload);
  const controlled = { source: "drop", qualityId: "standard", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] };

  const sample = game.Items.createInstance("wooden_sword", controlled);
  let result = await execute("autosell.add", { instanceId: sample.id });
  assert(result.ok && game.GameState.data.autoSell.rules.length === 1);
  const keptWhileDisabled = game.Items.add("wooden_sword", 1, controlled);
  assert.strictEqual(keptWhileDisabled.instances.length, 1, "Disabled rules must not sell drops");
  assert((await execute("autosell.toggle", { enabled: true })).ok);
  const goldBefore = game.GameState.data.gold;
  const sold = game.Items.add("wooden_sword", 1, controlled);
  assert.strictEqual(sold.instances.length, 0);
  assert.strictEqual(sold.autoSold.length, 1);
  assert.strictEqual(game.GameState.data.gold, goldBefore + sold.autoSellGold);
  const different = game.Items.add("wooden_sword", 1, { ...controlled, modifiers: { hp: 1, attack: 0, defense: 0 } });
  assert.strictEqual(different.instances.length, 1, "A stat difference must make a separate auto-sell identity");
  assert(game.Items.add("wooden_sword", 1, { ...controlled, source: "shop" }).instances.length === 1, "Purchased gear is protected");
  assert(game.Items.add("wooden_sword", 1, { ...controlled, source: "craft" }).instances.length === 1, "Crafted gear is protected");
  const unique = Object.values(game.GameData.items).find(item => item.unique);
  const uniqueGrant = game.Items.add(unique.id, 1, { ...controlled, source: "drop" });
  assert(unique && uniqueGrant.instances.length === 1, "Unique gear is protected");
  assert(!(await execute("autosell.add", { instanceId: uniqueGrant.instances[0].id })).ok, "Unique gear cannot be registered");
  const ultra = game.Items.createInstance("wooden_sword", { ...controlled, ultraRareTitleId: "worldbreaker" });
  assert(ultra.locked && !game.AutoSell.matchingRule(ultra, "drop"), "Ultra-rare equipment is locked and never auto-sold");
  assert(!(await execute("autosell.add", { instanceId: ultra.id })).ok, "Ultra-rare equipment cannot be registered");

  for (let index = 0; index < 12; index += 1) {
    const extra = game.Items.createInstance("wooden_sword", { qualityId: "standard", modifiers: { hp: 50 + index, attack: 0, defense: 0 }, equipmentSkills: [] });
    assert((await execute("autosell.add", { instanceId: extra.id })).ok);
  }
  assert(game.GameState.data.autoSell.rules.length > 8, "Auto-sell registrations must have no fixed limit");

  const hero = require("./helpers").createCharacter(game, "売却確認", "warrior");
  const identical = Array.from({ length: 3 }, () => game.Items.createInstance("wooden_sword", { qualityId: "standard", modifiers: { hp: 31, attack: 0, defense: 0 }, equipmentSkills: [] }));
  identical[0].locked = true;
  assert(game.Items.equip(hero.id, identical[1].id).ok);
  const key = game.Items.stackKey(identical[0]);
  const quote = game.AutoSell.stackQuote(key);
  assert.strictEqual(quote.count, 1, "Locked and equipped copies must be excluded from bulk sale");
  result = await execute("equipment.sellStack", { stackKey: key });
  assert(result.ok && result.count === 1);
  assert(game.Items.getInstance(identical[0].id) && game.Items.getInstance(identical[1].id) && !game.Items.getInstance(identical[2].id));

  assert(game.Party.toggle(hero.id).ok);
  assert(game.Dungeon.start("meadow").ok);
  const expedition = game.GameState.data.expeditions[0];
  const dropSeed = expedition.seed + 100003;
  const qualityRate = game.AcquisitionSkills.normalize(expedition.acquisitionBonuses).qualityRate;
  const predictedDrop = game.Items.createInstance("wooden_sword", { source: "drop", seed: dropSeed, qualityRateMultiplier: qualityRate.multiplier });
  { const registered = await execute("autosell.add", { instanceId: predictedDrop.id }); assert(registered.ok || game.AutoSell.matchingRule(predictedDrop, "drop"), registered.message); }
  assert(game.Items.sell(predictedDrop.id).ok);
  game.Battle.resolve = () => ({
    success: true, gold: 10, exp: 0,
    drops: [{ itemId: "wooden_sword", quantity: 1 }, { itemId: "iron_ore", quantity: 2 }],
    battleLog: [], mechanicReport: null, strategyReport: null, defeatFacts: [],
    encountersCleared: 1, totalEncounters: 1, monstersDefeated: 1,
    monsterCounts: {}, monsterEncounters: {}, monsterObservations: {}, memberReports: [], survivors: []
  });
  const expeditionGold = game.GameState.data.gold;
  game.GameState.data.expeditions[0].endsAt = 0;
  const expeditionResult = game.Dungeon.completeIfReady(1);
  assert.strictEqual(expeditionResult.autoSold.length, 1);
  assert.strictEqual(expeditionResult.drops.length, 1, "Auto-sold equipment must not appear as retained loot");
  assert.strictEqual(expeditionResult.drops[0].itemId, "iron_ore");
  assert.strictEqual(game.GameState.data.gold, expeditionGold + 10 + expeditionResult.autoSellGold);

  const roundTrip = game.SaveTransfer.parse(JSON.stringify(game.GameState.data));
  assert(roundTrip.ok && roundTrip.state.autoSell.enabled && roundTrip.state.autoSell.rules.length > 8);
  const invalid = JSON.parse(JSON.stringify(game.GameState.data));
  invalid.autoSell.rules[0].stackKey = "not-json";
  assert(!game.SaveTransfer.parse(JSON.stringify(invalid)).ok);
  const migrated = JSON.parse(JSON.stringify(game.GameState.data));
  delete migrated.autoSell;
  const parsedMigration = game.SaveTransfer.parse(JSON.stringify(migrated));
  assert(!parsedMigration.ok, "旧形式の自動売却設定は補完しません");
  assert(!(await execute("autosell.add", { instanceId: "item-999999" })).ok);

  const ui = fs.readFileSync(path.join(root, "js/ui.js"), "utf8");
  assert(ui.includes("add-auto-sell-rule") && !ui.includes("auto-sell-rule-form") && ui.includes("request-sell-stack") && ui.includes("探索ドロップの自動売却"));
  const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
  assert(css.includes(".auto-sell-panel") && css.includes("background: #f7f3e9") && css.includes("color: #fffaf0") && css.includes("color: #202a32"), "Auto-sell panel keeps explicit high-contrast colors");
  console.log("Auto-sell test passed: exact equipment identities, unlimited registrations, source/unique/ultra safety, rewards, bulk sale and strict validation");
})().catch(error => { console.error(error); process.exitCode = 1; });
