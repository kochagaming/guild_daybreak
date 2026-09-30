const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { id, innerHTML: "", textContent: "", value: "", scrollTop: 0, focus() {}, classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, disabled: false, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? button : null } });
}

async function run() {
  game.GameState.reset();
  const character = require("./helpers").createCharacter(game, "導線確認の戦士");
  game.UI.init(); game.UI.navigate("characters");
  let html = node("app").innerHTML;
  assert(html.includes('data-action="open-character"') && !html.includes("character-detail-card"));

  node(".main-area").scrollTop = 420;
  await click("open-character", { character: character.id });
  html = node("app").innerHTML;
  assert(html.includes("冒険者一覧へ戻る") && html.includes("導線確認の戦士") && html.includes("character-detail-card"));
  assert(html.includes("装備を変更") && html.includes("転職先を確認"));

  await click("open-equipment", { character: character.id });
  assert(node("modal-root").innerHTML.includes("導線確認の戦士の装備"));
  await click("close-modal");
  await click("request-class-change", { character: character.id });
  assert(node("modal-root").innerHTML.includes("導線確認の戦士の転職"));
  await click("close-modal");

  await click("character-back");
  html = node("app").innerHTML;
  assert(html.includes('data-action="open-character"') && !html.includes("character-detail-card"));
  assert.strictEqual(node(".main-area").scrollTop, 420);
  console.log("Character navigation test passed: compact directory, dedicated detail, equipment/class-change actions and list scroll restoration");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
