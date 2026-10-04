const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1])
  .filter(file => !["js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window, helpers = require("./helpers");

const humanId = helpers.createCharacter(game, "人の斥候", "ranger", "human", "hunter").id;
const dragonId = helpers.createCharacter(game, "竜の斥候", "ranger", "dragonewt", "hunter").id;
const human = game.Characters.get(humanId), dragon = game.Characters.get(dragonId);

assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("forgotten_titan_tomb")), ["tio"]);
assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("leviathan_trench")), ["shia"]);
assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("worldscar_glacier")), ["noah"]);
assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("white_dragon_roost")), ["kai"]);
assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("void_star_prison")), ["elena"]);
assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("star_eater_rootpit")), ["rize"]);
assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("hollow_coronation")), ["garm"]);
assert.deepStrictEqual(Array.from(game.DungeonPartyRules.companionIds("elder_dragon_crater")), []);

const raceRule = game.DungeonPartyRules.check("elder_dragon_crater", [dragon]);
assert(raceRule.ok && raceRule.restricted && raceRule.descriptions.includes("竜人のみ編成可能"));
assert(!game.DungeonPartyRules.check("elder_dragon_crater", [dragon, human]).ok, "Every member must satisfy a race-only restriction");

helpers.completeThrough(game, "ember_crown");
game.Party.toggle(humanId);
const blocked = game.Dungeon.start("elder_dragon_crater");
assert(!blocked.ok && blocked.message.includes("編成条件") && blocked.message.includes("人の斥候"), "Departure rejects an invalid party with the factual reason");
game.Party.toggle(humanId);
game.Party.toggle(dragonId);
assert(game.Dungeon.start("elder_dragon_crater").ok, "A matching race-only party can depart");
game.GameState.data.expeditions[0] = null;

helpers.completeThrough(game, "clockwork_desert");
const tio = game.Companions.character("tio");
assert(tio && game.DungeonPartyRules.check("forgotten_titan_tomb", [tio]).ok, "Tio alone satisfies the named-companion-only route");
assert(!game.DungeonPartyRules.check("forgotten_titan_tomb", [tio, dragon]).ok, "No additional adventurer may join a named-companion-only route");

helpers.completeThrough(game, "starsea_corridor");
const shia = game.Companions.character("shia");
assert(shia && game.DungeonPartyRules.check("leviathan_trench", [shia, dragon]).ok, "Shia can lead companions into the leviathan trench");
assert(!game.DungeonPartyRules.check("leviathan_trench", [dragon]).ok, "The leviathan trench requires Shia's tide song");
const noah = game.Companions.character("noah");
assert(noah && game.DungeonPartyRules.check("worldscar_glacier", [noah, dragon]).ok, "A required companion may travel with other members");
const missingNoah = game.DungeonPartyRules.check("worldscar_glacier", [dragon]);
assert(!missingNoah.ok && missingNoah.message.includes("ノアを編成してください"), "A required-companion route reports the missing character");

[
  ["white_dragon_roost", "kai"],
  ["void_star_prison", "elena"],
  ["star_eater_rootpit", "rize"],
  ["hollow_coronation", "garm"]
].forEach(([dungeonId, companionId]) => {
  const companion = game.Companions.character(companionId);
  assert(companion && game.DungeonPartyRules.check(dungeonId, [companion, dragon]).ok, `${companionId} satisfies the personal expedition rule`);
  assert(!game.DungeonPartyRules.check(dungeonId, [dragon]).ok, `${dungeonId} rejects a party without its featured companion`);
});

assert(game.GameData.dungeons.elder_dragon_crater.requiredForStory === false
  && game.GameData.dungeons.forgotten_titan_tomb.requiredForStory === false
  && game.GameData.dungeons.leviathan_trench.requiredForStory === false
  && game.GameData.dungeons.worldscar_glacier.requiredForStory === false,
"Initial restricted routes remain optional and cannot block the main story");
console.log("Dungeon party restriction test passed: race-only, named-only, required companion, departure guard and optional-route safety");
