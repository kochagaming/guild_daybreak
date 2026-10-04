const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
for (const raw of ["{", "null", "false", "0", '""', "[]"]) {
  let writes = 0;
  const context = vm.createContext({ window: {}, Date, Math, console: { warn() {} }, localStorage: {
    getItem: () => raw, setItem() { writes++; }, removeItem() { throw new Error("Must not delete original save"); }
  } });
  ["data/masterSchema.js", "data/items.js", "data/facilities.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context));
  assert(context.window.GameState.loadError, raw);
  assert(!context.window.GameState.needsInitialSave);
  assert.throws(() => context.window.GameState.save());
  assert.strictEqual(writes, 0);
}
console.log("Invalid save test passed: malformed JSON and non-object roots are preserved without automatic initialization writes");
