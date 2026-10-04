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
  require("./helpers").createCharacter(game, "経験の浅い魔術師", "mage");
  game.UI.init(); game.UI.navigate("characters");
  let html = node("app").innerHTML;
  assert(html.includes('data-action="open-character"') && !html.includes("character-detail-card"));

  node(".main-area").scrollTop = 420;
  await click("open-character", { character: character.id });
  html = node("app").innerHTML;
  assert(html.includes("冒険者一覧へ戻る") && html.includes("導線確認の戦士") && html.includes("character-detail-card"));
  assert(html.includes("遠征の足跡") && html.includes("まだ出撃記録はありません"), "A new adventurer starts with a compact empty expedition ledger");
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
  game.Characters.get(character.id).base = { hp: 9999, attack: 9999, defense: 9999 };
  assert(game.Party.toggle(character.id).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  game.GameState.data.expeditions[0].endsAt = Date.now() - 1;
  game.Dungeon.completeIfReady();
  const expeditionRecord = game.Characters.get(character.id).expeditionRecord;
  expeditionRecord.routeSuccesses += 5;
  expeditionRecord.routeEventSuccesses.hidden_passage = 5;
  expeditionRecord.treasureOpenings = 10;
  await click("open-character", { character: character.id });
  html = node("app").innerHTML;
  assert(html.includes("出撃 1回・攻略 1回") && html.includes("累計実ダメージ") && html.includes("一遠征の最高与ダメージ"), "Completed expeditions accumulate in the adventurer's personal ledger");
  assert(html.includes("道中で身についた経験") && html.includes("隠し道を見つけた") && html.includes("封印箱を開けた") && html.includes("身についた得意分野") && html.includes("隠し道") && html.includes("開錠"), "The personal ledger combines route and chest-opening experience into compact field specialties");
  assert(html.includes("隠し道の記章"), "Repeated success in one route-event discipline earns a selectable specialist medal");
  assert(html.includes('data-action="select-record-title"') && html.includes("初陣の記章"), "Earned personal medals can be selected from the expedition ledger");
  assert((await game.GameClient.execute("character.recordTitle", { characterId: character.id, milestoneId: "first_sortie" })).ok, "An earned medal can be displayed as the adventurer's record title");
  game.UI.render(); html = node("app").innerHTML;
  assert(html.includes("初陣の記章") && html.includes("表示中"), "The selected record title is visible on the adventurer detail");
  assert(!(await game.GameClient.execute("character.recordTitle", { characterId: character.id, milestoneId: "hundred_victories" })).ok, "An unearned medal cannot be displayed");
  await click("character-back"); html = node("app").innerHTML;
  assert(html.includes("探索 隠し道・開錠") && html.includes('data-character-filter="specialty"') && html.includes('value="treasure_opening"') && html.includes("探索経験順"), "The character directory exposes compact field specialties, filtering and experience sorting");
  await listeners.change({ target: { value: "hidden_passage", dataset: { characterFilter: "specialty" }, hasAttribute: key => key === "data-character-filter" } });
  html = node("app").innerHTML;
  assert(html.includes("導線確認の戦士") && !html.includes("経験の浅い魔術師") && html.includes("1ページ · 1人"), "A field-specialty filter isolates experienced adventurers from a large directory");
  await listeners.change({ target: { value: "all", dataset: { characterFilter: "specialty" }, hasAttribute: key => key === "data-character-filter" } });
  game.UI.navigate("archives"); await click("archive-view", { view: "records" });
  html = node("app").innerHTML;
  assert(html.includes("遠征者の記録") && html.includes("遠征回数") && html.includes("一遠征の与ダメージ") && html.includes("導線確認の戦士") && html.includes("初陣の記章"), "The archive compares actual personal records and displayed medals across adventurers");
  console.log("Character navigation test passed: compact directory, dedicated detail, equipment/class-change actions and list scroll restoration");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
