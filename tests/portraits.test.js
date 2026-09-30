const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
let saved = null;
const root = path.join(__dirname, "..");
function load() {
  const context = vm.createContext({ window: {}, Date, Math, localStorage: {
    getItem: () => saved, setItem: (key, value) => { saved = value; }, removeItem: () => {}
  } });
  ["data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/ui/portraitViews.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context));
  return context.window;
}
let game = load();
assert.strictEqual(Object.keys(game.GameData.portraits).length, 143);
assert.strictEqual(Object.values(game.GameData.portraits).filter(portrait => portrait.sourceType === "job").length, 45);
assert.strictEqual(Object.values(game.GameData.portraits).filter(portrait => portrait.sourceType === "race").length, 45);
assert.strictEqual(Object.values(game.GameData.portraits).filter(portrait => portrait.sourceType === "birth").length, 45);
const generatedImages = Object.values(game.GameData.portraits).filter(portrait => !portrait.legacy).map(portrait => portrait.image);
assert.strictEqual(new Set(generatedImages).size, 135);
const allImages = Object.values(game.GameData.portraits).map(portrait => portrait.image);
assert.strictEqual(new Set(allImages).size, 143);
allImages.forEach(file => {
  assert(file, "generated portrait should reference an individual image");
  const image = fs.readFileSync(path.join(root, file));
  assert.strictEqual(image.subarray(1, 4).toString(), "PNG");
  assert.strictEqual(image.readUInt32BE(16), 256, `${file} should be 256px wide`);
  assert.strictEqual(image.readUInt32BE(20), 384, `${file} should be 384px high`);
});
const ids = [];
for (const portrait of Object.values(game.GameData.portraits)) {
  assert(!portrait.atlas && !portrait.crop && !portrait.columns && !portrait.rows, `${portrait.id} should not depend on atlas cropping`);
  const created = require("./helpers").createCharacter(game, "外見テスト", "mage", "elf", "sacred", portrait.id);
  assert(created.ok);
  const character = game.Characters.get(created.id);
  assert.strictEqual(character.portraitId, portrait.id);
  const before = JSON.stringify(game.Characters.stats(character));
  character.portraitId = "knight";
  assert.strictEqual(JSON.stringify(game.Characters.stats(character)), before, "外見が能力へ影響しないこと");
  character.portraitId = portrait.id;
  ids.push(created.id);
}
game.GameState.save();
game = load();
ids.forEach((id, index) => assert.strictEqual(game.Characters.portraitId(game.Characters.get(id)), Object.keys(game.GameData.portraits)[index]));
assert.strictEqual(game.Characters.portraitId({ jobId: "cleric", raceId: "human", birthId: "common" }), "job-cleric-1");
assert.strictEqual(game.Characters.portraitId({ jobId: "thief", raceId: "human", birthId: "common", portraitId: "missing" }), "job-thief-1");
assert.strictEqual(game.Characters.matchingPortraits({ jobId: "mage", raceId: "elf", birthId: "sacred" }).length, 9);
assert.strictEqual(game.Characters.portraitChoices({ jobId: "mage", raceId: "elf", birthId: "sacred" }).length, 143);
const portraitChoices = game.Characters.portraitChoices({ jobId: "mage", raceId: "elf", birthId: "sacred" });
const firstJobPage = game.GameUIViews.portraits.catalog(portraitChoices, { type: "job", page: 0, pageSize: 15 });
assert.strictEqual(firstJobPage.total, 45);
assert.strictEqual(firstJobPage.items.length, 15);
assert.strictEqual(firstJobPage.pages, 3);
const birthSearch = game.GameUIViews.portraits.catalog(portraitChoices, { type: "birth", query: "神官の家", page: 0, pageSize: 15 });
assert.strictEqual(birthSearch.total, 3);
assert(birthSearch.items.every(portrait => portrait.name.includes("神官の家")));
assert.strictEqual(game.GameUIViews.portraits.catalog(portraitChoices, { query: "存在しない画像" }).total, 0);
assert(game.GameUIViews.portraits.image({ escape: value => value }, { portraitId: "job-mage-1" }).includes('class="character-avatar-image"'));
const portraitCss = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
assert(portraitCss.includes("--portrait-width: 56px") && portraitCss.includes("height: calc(var(--portrait-width) * 1.5)"), "all portrait contexts should share a 2:3 frame");
const mobilePreview = fs.readFileSync(path.join(root, "tools/mobile-preview.html"), "utf8");
assert(mobilePreview.includes('title="390px preview"') && mobilePreview.includes('title="430px preview"'), "mobile preview should expose both supported QA widths");
assert(mobilePreview.includes('src="../index.html"'), "mobile preview should load the real game UI");
const invalid = require("./helpers").createCharacter(game, "不正値", "mage", "human", "common", "../../bad");
assert.strictEqual(game.Characters.get(invalid.id).portraitId, "job-mage-1");
console.log("Portrait test passed: 135 trait portraits plus 8 legacy selections, all 143 manual choices, nine matching recruitment choices, persistence and cosmetic-only effects");

