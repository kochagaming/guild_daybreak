const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = new Date(2026, 9, 4, 8, 0, 0).getTime();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .42 });
}

const game = context.window;
game.GameState.reset();
const first = game.ExpeditionRumors.current(), repeated = game.ExpeditionRumors.current();
assert(first && first.dungeonId === "meadow" && first.id === repeated.id && first.dayKey === repeated.dayKey, "The same progress and day produce one stable enterable-route rumor");
const definition = game.ExpeditionRumors.definition(first), base = game.AcquisitionSkills.empty(), boosted = game.ExpeditionRumors.apply(base, first);
const target = definition.effect.metric === "experience" ? boosted.experience.party : boosted[definition.effect.metric];
assert(target.multiplier > 1, "The rumored route applies its defined acquisition bonus");
const tomorrow = now + 24 * 60 * 60 * 1000;
assert.notStrictEqual(game.ExpeditionRumors.current(tomorrow).dayKey, first.dayKey, "Traveler rumors rotate with the local calendar day");
assert(Object.isFrozen(first), "Rumor snapshots exposed to callers are immutable");
console.log("Expedition rumors test passed: stable local-day selection, enterable route targeting, data-driven acquisition effect and daily rotation");
