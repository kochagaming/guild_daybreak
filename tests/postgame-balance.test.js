const assert = require("assert");
const balance = require("../tools/balance-report");

const options = {
  runs: 12,
  chapterId: "afterstar_reaches_1",
  difficulty: "normal",
  profiles: ["balanced"]
};

function rates(quality, enhancement) {
  const report = balance.generate({ ...options, quality, enhancement });
  return Object.fromEntries(report.entries.map(entry => [entry.dungeonId, entry.results[0].winRate]));
}

const unprepared = rates("standard", "none");
const prepared = rates("familiar", "half");
const highlyPrepared = rates("refined", "half");
const requiredIds = [
  "gray_ash_sea",
  "inverted_glass_canyon",
  "worldskin_garden",
  "silent_iron_city",
  "distant_observatory"
];

assert(requiredIds.every(id => prepared[id] > unprepared[id]), "preparation must improve every required postgame route");
assert(requiredIds.every(id => prepared[id] >= 75), "a prepared balanced party should be able to clear the required postgame routes");
assert(prepared.five_reaches_nest < Math.min(...requiredIds.map(id => prepared[id])), "the optional nest should remain harder than the required route");
assert(highlyPrepared.five_reaches_nest > prepared.five_reaches_nest, "higher-quality equipment should materially improve the optional challenge");

console.log("Postgame balance test passed: preparation opens required routes while the optional nest demands a stronger loadout");
