const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const game = context.window, helpers = require("./helpers");
game.GameState.reset();
const predecessor = helpers.createCharacter(game, "最初の案内役");
const mentor = helpers.createCharacter(game, "道を継いだ案内役");
const apprentice = helpers.createCharacter(game, "初めて歩く新人");
game.GameState.data.partyHistory[0] = Array.from({ length: 10 }, (_, index) => ({
  id: `guide-clear-${index}`, dungeonId: "meadow", difficultyId: "normal", success: true, completedAt: index + 1,
  partySetup: [{ id: mentor.id }], battle: { members: [] }
}));
game.Characters.recordRouteMentorship(game.Characters.get(mentor.id), { role: "apprentice", partnerCharacterId: predecessor.id, dungeonId: "meadow", difficultyId: "normal", completedAt: 1 });
game.Characters.recordRouteMentorship(game.Characters.get(predecessor.id), { role: "mentor", partnerCharacterId: mentor.id, dungeonId: "meadow", difficultyId: "normal", completedAt: 1 });
game.GameState.data.parties[0] = [predecessor.id, mentor.id, apprentice.id];

let candidates = game.Party.routeTraditionCandidates("meadow", "normal");
assert.strictEqual(candidates.length, 1, "A learned guide, their original teacher and a newcomer form one exact route-marker candidate");
assert.deepStrictEqual(JSON.parse(JSON.stringify(candidates[0].characterNames)), ["最初の案内役", "道を継いだ案内役", "初めて歩く新人"]);
assert.strictEqual(candidates[0].mentorClears, 10, "Only an adventurer who reached the guide tier can carry the route onward");
assert.strictEqual(candidates[0].readyPartyIndex, 0, "A waiting party containing all three generations is identified as ready");
assert.strictEqual(candidates[0].partyOverlap, 3);

game.GameState.data.expeditions[0] = { partyIds: [predecessor.id, mentor.id, apprentice.id] };
candidates = game.Party.routeTraditionCandidates("meadow", "normal");
assert.strictEqual(candidates[0].readyPartyIndex, null, "An exploring party is not advertised as ready for another route-marker expedition");
assert.deepStrictEqual(JSON.parse(JSON.stringify(candidates[0].busyNames)), ["最初の案内役", "道を継いだ案内役", "初めて歩く新人"]);
game.GameState.data.expeditions[0] = null;
game.GameState.data.unlockedPartyCount = 2;
game.GameState.data.parties[0] = [predecessor.id, apprentice.id];
game.GameState.data.parties[1] = [mentor.id];
assert(game.Party.transfer(mentor.id, 0).ok, "A waiting lineage member can be moved atomically into the planned party");
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.GameState.data.parties[0])), [predecessor.id, apprentice.id, mentor.id]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.GameState.data.parties[1])), [], "Moving a member removes them from their previous waiting party");
assert.strictEqual(game.Party.routeTraditionCandidates("missing", "normal").length, 0, "Unknown routes never produce planning candidates");
console.log("Route tradition planning test passed: exact candidates, guide threshold, busy-state guidance and atomic party transfer");
