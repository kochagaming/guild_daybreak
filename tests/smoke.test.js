const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const storage = new Map();
const context = vm.createContext({
  console,
  Date,
  Math,
  window: {},
  localStorage: {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  }
});
context.window.window = context.window;
context.window.localStorage = context.localStorage;

[
  "data/masterSchema.js", "data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/characterGrowth.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/monsters.js", "data/dungeons.js", "data/recipes.js", "js/runtime.js", "js/storage.js", "js/save.js",
  "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/shop.js",
  "js/party.js", "js/monsterLoot.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/combatMath.js", "js/combatDecision.js", "js/battle.js", "js/dungeon.js", "js/blacksmith.js"
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));

const game = context.window;
function assert(condition, message) { if (!condition) throw new Error(message); }

const created = require("./helpers").createCharacter(game, "テスト冒険者", "cleric");
assert(created.ok, "冒険者を作成できること");
assert(game.Characters.get(created.id).jobId === "cleric", "作成時に職業を選択できること");
const startingWeightUnit = game.Characters.equipmentWeightUnitAtLevel(1);
assert(game.Characters.maxWeight(game.Characters.get(created.id)) === Math.round(startingWeightUnit * 10) / 10, "Lv.1の標準職は序盤向け装備1個分から始まること");
const initialWeapon = game.Items.available("weapon")[0];
assert(game.Items.equip(created.id, initialWeapon.id).ok, "武器個体を装備できること");
assert(game.Characters.equipmentWeight(game.Characters.get(created.id)) === 2, "装備重量が反映されること");
const tooHeavy = game.Items.createInstance("steel_sword", { qualityId: "hefty", modifiers: { hp: 0, attack: 0, defense: 0 } });
assert(!game.Items.canEquip(created.id, tooHeavy.id).ok, "装備可能重量を超える装備を拒否すること");
assert(game.Items.effects(tooHeavy).attack === game.Items.standardEffects("steel_sword").attack * 4 && game.Items.effects(tooHeavy).weight === 16, "ずっしりとした品質が性能4倍・重量2倍にすること");
const featherlight = game.Items.createInstance("iron_sword", { qualityId: "featherlight", modifiers: { hp: 0, attack: 0, defense: 0 } });
assert(game.Items.effects(featherlight).attack === Math.round(game.Items.standardEffects("iron_sword").attack * .5) && game.Items.effects(featherlight).weight === 2.5, "羽根のような品質が性能・重量を半減すること");
const capacityBeforeLevel = game.Characters.maxWeight(game.Characters.get(created.id));
game.Characters.get(created.id).level += 1;
const levelTwoExpectedWeight = game.Characters.equipmentCapacityAtLevel(2) * game.Characters.equipmentWeightUnitAtLevel(2);
assert(game.Characters.maxWeight(game.Characters.get(created.id)) === Math.round(levelTwoExpectedWeight * 10) / 10 && capacityBeforeLevel === Math.round(startingWeightUnit * 10) / 10, "節目の間も装備可能重量が滑らかに増えること");
game.Characters.get(created.id).level = 10;
assert(game.Characters.learnedSkills(game.Characters.get(created.id)).some((skill) => skill.id === "heal"), "レベルアップで職業スキルを習得すること");
const rolled = game.Items.createInstance("iron_sword", { source: "drop", seed: 12345 });
assert(rolled.id !== initialWeapon.id, "同じ種類の装備を個体管理できること");
assert(game.Items.displayName(rolled).includes(game.Items.template(rolled.templateId).name), "品質付きの装備名を生成できること");
assert(game.Party.toggle(created.id).ok, "パーティへ編成できること");
assert(game.Dungeon.start("meadow").ok, "探索を開始できること");
game.GameState.data.expeditions[0].endsAt = Date.now() - 1;
const result = game.Dungeon.completeIfReady();
assert(result && typeof result.success === "boolean", "探索を完了できること");
assert(Array.isArray(result.battleLog) && result.battleLog.length > 0, "戦闘ログが生成されること");
assert(result.battleLog.some((entry) => entry.kind === "hero"), "冒険者の行動が記録されること");
assert(result.battleLog.some((entry) => entry.kind === "enemy"), "モンスターの行動が記録されること");
assert(typeof result.monstersDefeated === "number", "討伐数が記録されること");
assert(result.memberReports.length === 1 && result.memberReports[0].id === created.id, "冒険者別の戦績が探索結果へ保存されること");
assert(game.GameState.data.expeditions[0] === null, "完了後に探索状態が解除されること");
const saleTarget = game.Items.createInstance("wooden_sword", { source: "shop" });
const goldBeforeSale = game.GameState.data.gold;
assert(game.Items.sell(saleTarget.id).ok && game.GameState.data.gold > goldBeforeSale, "個体装備を売却できること");
const dismantleTarget = game.Items.createInstance("cloth_clothes", { source: "shop" });
assert(game.Items.dismantle(dismantleTarget.id).ok && game.Items.count("craft_material") > 0, "個体装備を分解できること");
assert(storage.has(game.SaveSystem.exportKey), "localStorageへ保存されること");

console.log("Smoke test passed: migration-ready inventory → weight → quality → affix → equip → battle → sell/dismantle → save");

